const pool = require('../config/db');

/**
 * Normaliza y valida un monto monetario.
 * Rechaza NaN, infinitos, no positivos y magnitudes absurdas (anti-overflow).
 */
function assertPositiveMoney(value, fieldName = 'monto') {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1e12) {
    const err = new Error(`El ${fieldName} es inválido o fuera de rango permitido`);
    err.status = 400;
    throw err;
  }
  // Estabiliza comparación decimal a 2 dígitos (COP/centavos lógicos)
  return Math.round(n * 100) / 100;
}

// =====================
// OBTENER TODAS LAS DEUDAS DEL USUARIO
// =====================
const getDebts = async (req, res) => {
  try {
    const userId = req.user.id;

    const [debts] = await pool.query(
      `SELECT id, name, total_amount_cop, pending_balance_cop, due_date,
              interest_rate_monthly, status, paid_at, created_at
       FROM debts
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY status ASC, due_date ASC`,
      [userId]
    );

    res.json(debts);
  } catch (error) {
    console.error('Error al obtener deudas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// CREAR DEUDA
// =====================
const createDebt = async (req, res) => {
  const userId = req.user.id;
  const { name, total_amount_cop, pending_balance_cop, due_date, interest_rate_monthly } =
    req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'El nombre de la deuda es obligatorio' });
  }

  if (!due_date) {
    return res
      .status(400)
      .json({ message: 'Nombre, valor total y fecha de vencimiento son obligatorios' });
  }

  let total;
  let pending;
  let rate;

  try {
    total = assertPositiveMoney(total_amount_cop, 'valor total');
    pending =
      pending_balance_cop !== undefined && pending_balance_cop !== null && pending_balance_cop !== ''
        ? assertPositiveMoney(pending_balance_cop, 'saldo pendiente')
        : total;
    rate = Number(interest_rate_monthly);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'Tasa de interés mensual inválida' });
    }
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  if (pending > total) {
    return res
      .status(400)
      .json({ message: 'El saldo pendiente no puede ser mayor al valor total' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO debts
       (user_id, name, total_amount_cop, pending_balance_cop, due_date, interest_rate_monthly, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [userId, name.trim(), total, pending, due_date, rate]
    );

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'debts', 'debt_created', ?, CURDATE(), 'debt', ?)`,
      [userId, `Nueva deuda registrada: ${name.trim()}`, result.insertId]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Deuda creada correctamente',
      id: result.insertId,
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al crear deuda:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// =====================
// REALIZAR ABONO / PAGO
// =====================
const addPayment = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const debtId = Number(id);

  if (!Number.isInteger(debtId) || debtId <= 0) {
    return res.status(400).json({ message: 'Identificador de deuda inválido' });
  }

  let amount;
  try {
    amount = assertPositiveMoney(req.body.amount_cop, 'monto del abono');
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bloqueo pesimista: serializa abonos concurrentes sobre la misma deuda
    const [debts] = await conn.query(
      `SELECT id, name, total_amount_cop, pending_balance_cop, status
       FROM debts
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [debtId, userId]
    );

    if (debts.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Deuda no encontrada' });
    }

    const debt = debts[0];

    if (debt.status === 'paid' || Number(debt.pending_balance_cop) <= 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Esta deuda ya está pagada' });
    }

    const pending = Math.round(Number(debt.pending_balance_cop) * 100) / 100;

    if (amount > pending) {
      await conn.rollback();
      return res.status(400).json({
        message: `El abono no puede superar el saldo pendiente (${pending})`,
      });
    }

    const newPendingRaw = pending - amount;
    const isPaid = newPendingRaw <= 0;
    const newPending = isPaid ? 0 : Math.round(newPendingRaw * 100) / 100;

    // Siempre condicionar por user_id (defensa en profundidad / anti-IDOR)
    const [updateResult] = await conn.query(
      `UPDATE debts
       SET pending_balance_cop = ?,
           status = ?,
           paid_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [
        newPending,
        isPaid ? 'paid' : 'active',
        isPaid ? new Date() : null,
        debtId,
        userId,
      ]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Deuda no encontrada' });
    }

    await conn.query(
      `INSERT INTO debt_payments (debt_id, amount_cop, payment_date, remaining_balance_cop)
       VALUES (?, ?, CURDATE(), ?)`,
      [debtId, amount, newPending]
    );

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'debts', 'debt_payment_created', ?, CURDATE(), 'debt', ?)`,
      [userId, `Abono a deuda: ${debt.name}`, debtId]
    );

    if (isPaid) {
      await conn.query(
        `INSERT INTO financial_activities
         (user_id, category, event_type, title, event_date, entity_type, entity_id)
         VALUES (?, 'debts', 'debt_completed', ?, CURDATE(), 'debt', ?)`,
        [userId, `Deuda liquidada: ${debt.name}`, debtId]
      );
    }

    await conn.commit();

    res.json({
      message: isPaid ? 'Deuda liquidada correctamente' : 'Abono registrado correctamente',
      pending_balance_cop: newPending,
      status: isPaid ? 'paid' : 'active',
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al realizar abono:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// =====================
// ELIMINAR DEUDA (borrado lógico)
// =====================
const deleteDebt = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const debtId = Number(id);

  if (!Number.isInteger(debtId) || debtId <= 0) {
    return res.status(400).json({ message: 'Identificador de deuda inválido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `UPDATE debts
       SET deleted_at = NOW()
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [debtId, userId]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Deuda no encontrada' });
    }

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'debts', 'debt_deleted', 'Deuda eliminada', CURDATE(), 'debt', ?)`,
      [userId, debtId]
    );

    await conn.commit();
    res.json({ message: 'Deuda eliminada correctamente' });
  } catch (error) {
    await conn.rollback();
    console.error('Error al eliminar deuda:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// =====================
// ACTUALIZAR DEUDA
// =====================
const updateDebt = async (req, res) => {
  const userId = req.user.id;
  const debtId = Number(req.params.id);

  if (!Number.isInteger(debtId) || debtId <= 0) {
    return res.status(400).json({ message: 'Identificador de deuda inválido' });
  }

  const {
    name,
    total_amount_cop,
    pending_balance_cop,
    due_date,
    interest_rate_monthly,
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'El nombre de la deuda es obligatorio' });
  }
  if (!due_date) {
    return res.status(400).json({ message: 'La fecha de vencimiento es obligatoria' });
  }

  let total;
  let pending;
  let rate;

  try {
    total = assertPositiveMoney(total_amount_cop, 'valor total');
    pending = Number(pending_balance_cop);
    if (!Number.isFinite(pending) || pending < 0 || pending > 1e12) {
      return res.status(400).json({ message: 'El saldo pendiente es inválido' });
    }
    pending = Math.round(pending * 100) / 100;

    rate = Number(interest_rate_monthly);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'Tasa de interés mensual inválida' });
    }
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  if (pending > total) {
    return res.status(400).json({
      message: 'El saldo pendiente no puede ser mayor al valor total',
    });
  }

  const status = pending <= 0 ? 'paid' : 'active';
  const paidAt = status === 'paid' ? new Date() : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `UPDATE debts
       SET name = ?,
           total_amount_cop = ?,
           pending_balance_cop = ?,
           due_date = ?,
           interest_rate_monthly = ?,
           status = ?,
           paid_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [
        name.trim(),
        total,
        pending,
        due_date,
        rate,
        status,
        paidAt,
        debtId,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Deuda no encontrada' });
    }

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'debts', 'debt_updated', ?, CURDATE(), 'debt', ?)`,
      [userId, `Deuda actualizada: ${name.trim()}`, debtId]
    );

    await conn.commit();

    res.json({
      message: 'Deuda actualizada correctamente',
      id: debtId,
      status,
      pending_balance_cop: pending,
      total_amount_cop: total,
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al actualizar deuda:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

module.exports = {
  getDebts,
  createDebt,
  updateDebt,
  addPayment,
  deleteDebt,
};