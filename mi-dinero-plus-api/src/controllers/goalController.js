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
  return Math.round(n * 100) / 100;
}

const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);

// =====================
// OBTENER TODAS LAS METAS DEL USUARIO
// =====================
const getGoals = async (req, res) => {
  try {
    const userId = req.user.id;

    const [goals] = await pool.query(
      `SELECT id, name, target_amount_cop, current_amount_cop, deadline, priority, status, completed_at, created_at
       FROM savings_goals
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(goals);
  } catch (error) {
    console.error('Error al obtener metas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// CREAR META
// =====================
const createGoal = async (req, res) => {
  const userId = req.user.id;
  const { name, target_amount_cop, deadline, priority } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'El nombre de la meta es obligatorio' });
  }

  if (!deadline) {
    return res
      .status(400)
      .json({ message: 'Nombre, monto objetivo y fecha límite son obligatorios' });
  }

  let target;
  try {
    target = assertPositiveMoney(target_amount_cop, 'monto objetivo');
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  const priorityValue = ALLOWED_PRIORITIES.has(priority) ? priority : 'medium';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO savings_goals
       (user_id, name, target_amount_cop, current_amount_cop, deadline, priority, status)
       VALUES (?, ?, ?, 0, ?, ?, 'active')`,
      [userId, name.trim(), target, deadline, priorityValue]
    );

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'goals', 'goal_created', ?, CURDATE(), 'goal', ?)`,
      [userId, `Nueva meta creada: ${name.trim()}`, result.insertId]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Meta creada correctamente',
      id: result.insertId,
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al crear meta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// =====================
// APORTAR A UNA META
// =====================
const addContribution = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const goalId = Number(id);

  if (!Number.isInteger(goalId) || goalId <= 0) {
    return res.status(400).json({ message: 'Identificador de meta inválido' });
  }

  let amount;
  try {
    amount = assertPositiveMoney(req.body.amount_cop, 'monto del aporte');
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bloqueo pesimista: serializa aportes concurrentes sobre la misma meta
    const [goals] = await conn.query(
      `SELECT id, name, target_amount_cop, current_amount_cop, status
       FROM savings_goals
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [goalId, userId]
    );

    if (goals.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Meta no encontrada' });
    }

    const goal = goals[0];

    if (goal.status === 'completed') {
      await conn.rollback();
      return res.status(400).json({ message: 'Esta meta ya está completada' });
    }

    const current = Math.round(Number(goal.current_amount_cop) * 100) / 100;
    const target = Math.round(Number(goal.target_amount_cop) * 100) / 100;
    const pending = Math.round((target - current) * 100) / 100;

    if (pending <= 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Esta meta ya está completada' });
    }

    if (amount > pending) {
      await conn.rollback();
      return res.status(400).json({
        message: `El aporte no puede superar el saldo pendiente (${pending})`,
      });
    }

    const newCurrentRaw = current + amount;
    const isCompleted = newCurrentRaw >= target;
    const newCurrent = isCompleted
      ? target
      : Math.round(newCurrentRaw * 100) / 100;

    // Defensa en profundidad: mutación siempre acotada a user_id
    const [updateResult] = await conn.query(
      `UPDATE savings_goals
       SET current_amount_cop = ?,
           status = ?,
           completed_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [
        newCurrent,
        isCompleted ? 'completed' : 'active',
        isCompleted ? new Date() : null,
        goalId,
        userId,
      ]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Meta no encontrada' });
    }

    await conn.query(
      `INSERT INTO savings_goal_contributions (goal_id, amount_cop, contribution_date)
       VALUES (?, ?, CURDATE())`,
      [goalId, amount]
    );

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'goals', 'goal_contribution_created', ?, CURDATE(), 'goal', ?)`,
      [userId, `Aporte a meta: ${goal.name}`, goalId]
    );

    if (isCompleted) {
      await conn.query(
        `INSERT INTO financial_activities
         (user_id, category, event_type, title, event_date, entity_type, entity_id)
         VALUES (?, 'goals', 'goal_completed', ?, CURDATE(), 'goal', ?)`,
        [userId, `Meta completada: ${goal.name}`, goalId]
      );
    }

    await conn.commit();

    res.json({
      message: isCompleted
        ? 'Meta completada correctamente'
        : 'Aporte registrado correctamente',
      current_amount_cop: newCurrent,
      status: isCompleted ? 'completed' : 'active',
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al realizar aporte:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// =====================
// ELIMINAR META (borrado lógico)
// =====================
const deleteGoal = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const goalId = Number(id);

  if (!Number.isInteger(goalId) || goalId <= 0) {
    return res.status(400).json({ message: 'Identificador de meta inválido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `UPDATE savings_goals
       SET deleted_at = NOW()
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [goalId, userId]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Meta no encontrada' });
    }

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'goals', 'goal_deleted', 'Meta eliminada', CURDATE(), 'goal', ?)`,
      [userId, goalId]
    );

    await conn.commit();
    res.json({ message: 'Meta eliminada correctamente' });
  } catch (error) {
    await conn.rollback();
    console.error('Error al eliminar meta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// =====================
// ACTUALIZAR META
// =====================
const updateGoal = async (req, res) => {
  const userId = req.user.id
  const goalId = Number(req.params.id)

  if (!Number.isInteger(goalId) || goalId <= 0) {
    return res.status(400).json({ message: 'Identificador de meta inválido' })
  }

  const { name, target_amount_cop, deadline, priority } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'El nombre de la meta es obligatorio' })
  }
  if (!deadline) {
    return res.status(400).json({ message: 'La fecha límite es obligatoria' })
  }

  let target
  try {
    target = assertPositiveMoney(target_amount_cop, 'monto objetivo')
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message })
  }

  const priorityValue = ALLOWED_PRIORITIES.has(priority) ? priority : 'medium'

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query(
      `SELECT id, current_amount_cop, status
       FROM savings_goals
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [goalId, userId]
    )

    if (!rows.length) {
      await conn.rollback()
      return res.status(404).json({ message: 'Meta no encontrada' })
    }

    const current = Number(rows[0].current_amount_cop || 0)
    const completed = current >= target
    const newStatus = completed ? 'completed' : 'active'
    const completedAt = completed ? new Date() : null

    const [result] = await conn.query(
      `UPDATE savings_goals
       SET name = ?,
           target_amount_cop = ?,
           deadline = ?,
           priority = ?,
           status = ?,
           completed_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [
        name.trim(),
        target,
        deadline,
        priorityValue,
        newStatus,
        completedAt,
        goalId,
        userId,
      ]
    )

    if (result.affectedRows === 0) {
      await conn.rollback()
      return res.status(404).json({ message: 'Meta no encontrada' })
    }

    await conn.query(
      `INSERT INTO financial_activities
       (user_id, category, event_type, title, event_date, entity_type, entity_id)
       VALUES (?, 'goals', 'goal_updated', ?, CURDATE(), 'goal', ?)`,
      [userId, `Meta actualizada: ${name.trim()}`, goalId]
    )

    await conn.commit()

    res.json({
      message: 'Meta actualizada correctamente',
      id: goalId,
      status: newStatus,
      current_amount_cop: current,
      target_amount_cop: target,
    })
  } catch (error) {
    await conn.rollback()
    console.error('Error al actualizar meta:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  } finally {
    conn.release()
  }
}

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  addContribution,
  deleteGoal,
}