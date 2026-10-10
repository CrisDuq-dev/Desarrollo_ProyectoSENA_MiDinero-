feat: implement financial snapshot service and related functions

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function formatCOP(value) {
  const n = Math.round(toNum(value));
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('es-CO')}`;
}

async function getFinancialSnapshot(userId) {
  try {
    const [[tx]] = await pool.query(
      `SELECT
         COUNT(*) AS tx_count,
         COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount_cop END), 0) AS income_total,
         COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_cop END), 0) AS expense_total,
         COALESCE(SUM(CASE WHEN transaction_type = 'income'
                            AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                           THEN amount_cop END), 0) AS income_30d,
         COALESCE(SUM(CASE WHEN transaction_type = 'expense'
                            AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                           THEN amount_cop END), 0) AS expense_30d
       FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    const [[goals]] = await pool.query(
      `SELECT
         COUNT(*) AS goal_count,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS goals_completed,
         COALESCE(SUM(current_amount_cop), 0) AS saved_total,
         COALESCE(SUM(target_amount_cop), 0) AS target_total
       FROM savings_goals
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    const [[debts]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status <> 'paid' THEN 1 ELSE 0 END), 0) AS debts_active,
         COALESCE(SUM(CASE WHEN status <> 'paid' THEN pending_balance_cop END), 0) AS debts_pending,
         DATE_FORMAT(MIN(CASE WHEN status <> 'paid' THEN due_date END), '%Y-%m-%d') AS next_due
       FROM debts
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    const incomeTotal = toNum(tx.income_total);
    const expenseTotal = toNum(tx.expense_total);

    return {
      txCount: toNum(tx.tx_count),
      balance: incomeTotal - expenseTotal,
      income30d: toNum(tx.income_30d),
      expense30d: toNum(tx.expense_30d),
      goalCount: toNum(goals.goal_count),
      goalsCompleted: toNum(goals.goals_completed),
      savedTotal: toNum(goals.saved_total),
      targetTotal: toNum(goals.target_total),
      debtsActive: toNum(debts.debts_active),
      debtsPending: toNum(debts.debts_pending),
      nextDue: debts.next_due || null,
    };
  } catch (error) {
    console.error('No se pudo calcular el resumen financiero para la IA:', error.message);
    return null;
  }
}

function formatSnapshotForPrompt(snapshot) {
  if (!snapshot) return '';

  const lines = [];

  if (snapshot.txCount > 0) {
    lines.push(`- Balance total (ingresos menos gastos): ${formatCOP(snapshot.balance)} COP`);
    if (snapshot.income30d > 0 || snapshot.expense30d > 0) {
      let line = `- Últimos 30 días: ingresos ${formatCOP(snapshot.income30d)}, gastos ${formatCOP(snapshot.expense30d)}`;
      if (snapshot.income30d > 0) {
        const pct = Math.round((snapshot.expense30d / snapshot.income30d) * 100);
        line += ` (los gastos equivalen al ${pct} % de los ingresos)`;
      }
      lines.push(line);
    }
  } else {
    lines.push('- Aún no tiene transacciones registradas.');
  }

  if (snapshot.goalCount > 0) {
    let line = `- Metas: ${snapshot.goalCount} en total, ${snapshot.goalsCompleted} cumplidas`;
    if (snapshot.targetTotal > 0) {
      const pct = Math.round((snapshot.savedTotal / snapshot.targetTotal) * 100);
      line += `; ahorrado ${formatCOP(snapshot.savedTotal)} de ${formatCOP(snapshot.targetTotal)} (${pct} %)`;
    }
    lines.push(line);
  } else {
    lines.push('- Aún no tiene metas de ahorro.');
  }

  if (snapshot.debtsActive > 0) {
    let line = `- Deudas activas: ${snapshot.debtsActive}, saldo pendiente ${formatCOP(snapshot.debtsPending)}`;
    if (snapshot.nextDue) line += `, próximo vencimiento ${snapshot.nextDue}`;
    lines.push(line);
  } else {
    lines.push('- No tiene deudas activas.');
  }

  return lines.join('\n');
}

module.exports = { getFinancialSnapshot, formatSnapshotForPrompt, formatCOP };
