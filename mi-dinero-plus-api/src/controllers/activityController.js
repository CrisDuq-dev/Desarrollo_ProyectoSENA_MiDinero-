const pool = require('../config/db');

// ===================================
// OBTENER NOTIFICACIONES DEL USUARIO
// ===================================
const getActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const [activities] = await pool.query(
      `SELECT id, category, event_type, title, event_date, event_time, 
              entity_type, entity_id, payload, is_read, created_at
       FROM financial_activities
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json(activities);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =========================================
// OBTENER SOLO NO LEÍDAS (para la campana)
// =========================================
const getUnreadActivities = async (req, res) => {
  try {
    const userId = req.user.id;

    const [activities] = await pool.query(
      `SELECT id, category, event_type, title, event_date, event_time, 
              entity_type, entity_id, is_read, created_at
       FROM financial_activities
       WHERE user_id = ? AND is_read = FALSE
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM financial_activities
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    res.json({
      activities,
      unread_count: countResult[0].unread_count,
    });
  } catch (error) {
    console.error('Error al obtener no leídas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ==========================
// MARCAR TODAS COMO LEÍDAS
// ==========================
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `UPDATE financial_activities 
       SET is_read = TRUE 
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar como leídas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ======================
// MARCAR UNA COMO LEÍDA
// ======================
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE financial_activities 
       SET is_read = TRUE 
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// BORRAR UNA ACTIVIDAD
// =====================
const deleteActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.query(
      `DELETE FROM financial_activities WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Actividad no encontrada' });
    }

    res.json({ message: 'Actividad eliminada' });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =========================================
// BORRAR TODAS LAS ACTIVIDADES DEL USUARIO
// =========================================
const clearAllActivities = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(`DELETE FROM financial_activities WHERE user_id = ?`, [
      userId,
    ]);

    res.json({ message: 'Historial de actividades eliminado' });
  } catch (error) {
    console.error('Error al limpiar actividades:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  getActivities,
  getUnreadActivities,
  markAllAsRead,
  markAsRead,
  deleteActivity,
  clearAllActivities,
};