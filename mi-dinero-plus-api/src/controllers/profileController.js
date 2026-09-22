const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// =====================
// OBTENER PERFIL + CONFIGURACIÓN
// =====================
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      `SELECT id, full_name, email, account_status, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const [profiles] = await pool.query(
      `SELECT job_role, company_name,
              avatar_mode, avatar_animal, avatar_color,
              avatar_type, avatar_style, avatar_seed,
              avatar_options, avatar_url
       FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    const [settings] = await pool.query(
      `SELECT currency_code, education_level, ai_assistant_enabled, 
              animations_enabled, theme 
       FROM simulation_settings WHERE user_id = ?`,
      [userId]
    );

    res.json({
      user: users[0],
      profile: profiles[0] || {},
      settings: settings[0] || {},
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// ACTUALIZAR PERFIL (cargo, avatar, etc.)
// =====================
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      job_role,
      avatar_mode,
      avatar_animal,
      avatar_color,
      avatar_type,
      avatar_style,
      avatar_seed,
      avatar_options,
      avatar_url,
    } = req.body;

    await pool.query(
      `UPDATE user_profiles SET
         job_role = COALESCE(?, job_role),
         avatar_mode = COALESCE(?, avatar_mode),
         avatar_animal = COALESCE(?, avatar_animal),
         avatar_color = COALESCE(?, avatar_color),
         avatar_type = COALESCE(?, avatar_type),
         avatar_style = COALESCE(?, avatar_style),
         avatar_seed = COALESCE(?, avatar_seed),
         avatar_options = COALESCE(?, avatar_options),
         avatar_url = COALESCE(?, avatar_url)
       WHERE user_id = ?`,
      [
        job_role ?? null,
        avatar_mode ?? null,
        avatar_animal ?? null,
        avatar_color ?? null,
        avatar_type ?? null,
        avatar_style ?? null,
        avatar_seed ?? null,
        avatar_options != null ? JSON.stringify(avatar_options) : null,
        avatar_url ?? null,
        userId,
      ]
    );

    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// ACTUALIZAR CONFIGURACIÓN DE SIMULACIÓN
// =====================
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      currency_code,
      education_level,
      ai_assistant_enabled,
      animations_enabled,
      theme,
    } = req.body;

    await pool.query(
      `UPDATE simulation_settings 
       SET currency_code = COALESCE(?, currency_code),
           education_level = COALESCE(?, education_level),
           ai_assistant_enabled = COALESCE(?, ai_assistant_enabled),
           animations_enabled = COALESCE(?, animations_enabled),
           theme = COALESCE(?, theme)
       WHERE user_id = ?`,
      [
        currency_code,
        education_level,
        ai_assistant_enabled,
        animations_enabled,
        theme,
        userId,
      ]
    );

    res.json({ message: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// ACTUALIZAR NOMBRE O CORREO (datos básicos)
// =====================
const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, email } = req.body;

    if (email) {
      const [existing] = await pool.query(
        `SELECT id FROM users WHERE email = ? AND id != ?`,
        [email, userId]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: 'El correo ya está en uso' });
      }
    }

    await pool.query(
      `UPDATE users 
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email)
       WHERE id = ?`,
      [full_name, email, userId]
    );

    res.json({ message: 'Datos de usuario actualizados correctamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// CAMBIAR CONTRASEÑA (real, con bcrypt)
// =====================
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Debes enviar la contraseña actual y la nueva',
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        message: 'La nueva contraseña debe tener al menos 8 caracteres',
      });
    }

    const [rows] = await pool.query(
      `SELECT id, password_hash FROM users WHERE id = ?`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];

    if (!user.password_hash) {
      return res.status(400).json({
        message:
          'Esta cuenta no tiene contraseña local (probablemente entraste con Google). Usa "Olvidé mi contraseña" o inicia con Google.',
      });
    }

    const ok = await bcrypt.compare(String(currentPassword), user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(String(newPassword), salt);

    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      hash,
      userId,
    ]);

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =====================
// REINICIAR SIMULACIÓN
// Soft-delete transacciones, metas y deudas + borra actividades
// No toca users, perfil ni settings
// =====================
const resetSimulation = async (req, res) => {
  const userId = req.user.id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE transactions
       SET deleted_at = NOW()
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    await conn.query(
      `UPDATE savings_goals
       SET deleted_at = NOW()
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    await conn.query(
      `UPDATE debts
       SET deleted_at = NOW()
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    await conn.query(`DELETE FROM financial_activities WHERE user_id = ?`, [
      userId,
    ]);

    await conn.commit();

    return res.json({
      ok: true,
      message:
        'Simulación reiniciada. Transacciones, metas, deudas y actividad eliminadas.',
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al reiniciar simulación:', error);
    return res.status(500).json({
      message: 'No se pudo reiniciar la simulación',
    });
  } finally {
    conn.release();
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateSettings,
  updateUser,
  changePassword,
  resetSimulation,
};