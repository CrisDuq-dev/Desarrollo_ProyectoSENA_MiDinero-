const pool = require('../config/db');

const ALLOWED_TYPES = new Set(['income', 'expense']);

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
  return Math.round(n * 100) / 100;
}

function sanitizeText(value, fieldName, { min = 1, max = 255 } = {}) {
  if (typeof value !== 'string') {
    const err = new Error(`${fieldName} es obligatorio`);
    err.status = 400;
    throw err;
  }
  const text = value.trim();
  if (text.length < min || text.length > max) {
    const err = new Error(
      `${fieldName} debe tener entre ${min} y ${max} caracteres`
    );
    err.status = 400;
    throw err;
  }
  return text;
}

/** Tasa opcional: null si no viene o no es válida */
function parseOptionalRate(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// =====================
// OBTENER TODAS LAS TRANSACCIONES DEL USUARIO
// =====================
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const [transactions] = await pool.query(
      `SELECT id, transaction_type, amount_cop, rate_usd, rate_eur,
              transaction_date, description, category_code, created_at
       FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY transaction_date DESC, created_at DESC`,
      [userId]
    );

    res.json(transactions);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// CREAR TRANSACCIÓN
// =====================
const createTransaction = async (req, res) => {
  const userId = req.user.id;
  const {
    transaction_type,
    amount_cop,
    transaction_date,
    description,
    category_code,
    rate_usd,
    rate_eur,
  } = req.body;

  if (!transaction_type || !transaction_date || !description || !category_code) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  if (!ALLOWED_TYPES.has(transaction_type)) {
    return res.status(400).json({
      message: 'El tipo de transacción debe ser income o expense',
    });
  }

  let amount;
  let cleanDescription;
  let cleanCategory;

  try {
    amount = assertPositiveMoney(amount_cop, 'monto');
    cleanDescription = sanitizeText(description, 'La descripción', {
      min: 1,
      max: 255,
    });
    cleanCategory = sanitizeText(String(category_code), 'La categoría', {
      min: 1,
      max: 64,
    });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  const rateUsd = parseOptionalRate(rate_usd);
  const rateEur = parseOptionalRate(rate_eur);

  // Validación básica de fecha (YYYY-MM-DD o ISO parseable)
  const dateObj = new Date(transaction_date);
  if (Number.isNaN(dateObj.getTime())) {
    return res.status(400).json({ message: 'La fecha de la transacción no es válida' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO transactions
       (user_id, transaction_type, amount_cop, rate_usd, rate_eur,
        transaction_date, description, category_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        transaction_type,
        amount,
        rateUsd,
        rateEur,
        transaction_date,
        cleanDescription,
        cleanCategory,
      ]
    );

    const titlePrefix =
      transaction_type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto';

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'transactions', 'transaction_created', ?, CURDATE(), 'transaction', ?)`,
      [userId, `${titlePrefix}: ${cleanDescription}`, result.insertId]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Transacción creada correctamente',
      id: result.insertId,
      rate_usd: rateUsd,
      rate_eur: rateEur,
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al crear transacción:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// =====================
// ELIMINAR TRANSACCIÓN (borrado lógico)
// =====================
const deleteTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const transactionId = Number(id);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return res.status(400).json({ message: 'Identificador de transacción inválido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `UPDATE transactions
       SET deleted_at = NOW()
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [transactionId, userId]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'transactions', 'transaction_deleted', 'Transacción eliminada', CURDATE(), 'transaction', ?)`,
      [userId, transactionId]
    );

    await conn.commit();
    res.json({ message: 'Transacción eliminada correctamente' });
  } catch (error) {
    await conn.rollback();
    console.error('Error al eliminar transacción:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// =====================
// ACTUALIZAR TRANSACCIÓN
// =====================
const updateTransaction = async (req, res) => {
  const userId = req.user.id
  const transactionId = Number(req.params.id)

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return res.status(400).json({ message: 'Identificador de transacción inválido' })
  }

  const {
    transaction_type,
    amount_cop,
    transaction_date,
    description,
    category_code,
  } = req.body

  if (!transaction_type || !transaction_date || !description || !category_code) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' })
  }

  if (!ALLOWED_TYPES.has(transaction_type)) {
    return res.status(400).json({
      message: 'El tipo de transacción debe ser income o expense',
    })
  }

  let amount
  let cleanDescription
  let cleanCategory

  try {
    amount = assertPositiveMoney(amount_cop, 'monto')
    cleanDescription = sanitizeText(description, 'La descripción', {
      min: 1,
      max: 255,
    })
    cleanCategory = sanitizeText(String(category_code), 'La categoría', {
      min: 1,
      max: 64,
    })
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message })
  }

  const dateObj = new Date(transaction_date)
  if (Number.isNaN(dateObj.getTime())) {
    return res.status(400).json({ message: 'La fecha de la transacción no es válida' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [result] = await conn.query(
      `UPDATE transactions
       SET transaction_type = ?,
           amount_cop = ?,
           transaction_date = ?,
           description = ?,
           category_code = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [
        transaction_type,
        amount,
        transaction_date,
        cleanDescription,
        cleanCategory,
        transactionId,
        userId,
      ]
    )

    if (result.affectedRows === 0) {
      await conn.rollback()
      return res.status(404).json({ message: 'Transacción no encontrada' })
    }

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'transactions', 'transaction_updated', ?, CURDATE(), 'transaction', ?)`,
      [userId, `Transacción actualizada: ${cleanDescription}`, transactionId]
    )

    await conn.commit()
    res.json({ message: 'Transacción actualizada correctamente', id: transactionId })
  } catch (error) {
    await conn.rollback()
    console.error('Error al actualizar transacción:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  } finally {
    conn.release()
  }
}

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
}