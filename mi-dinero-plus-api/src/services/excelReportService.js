const ExcelJS = require('exceljs')

function money(n) {
  return Number(n) || 0
}

/** Fecha segura → YYYY-MM-DD (evita el bug del año 2001) */
function formatDateCell(value) {
  if (value == null || value === '') return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const s = String(value).trim()

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }

  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    if (y >= 2020 && y <= 2100) return `${y}-${m}-${day}`
  }

  return s.slice(0, 10)
}

const PRIORITY_ES = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const STATUS_ES = {
  active: 'Activa',
  completed: 'Completada',
  cancelled: 'Cancelada',
  paid: 'Pagada',
  overdue: 'Vencida',
  pending: 'Pendiente',
}

function toPriorityEs(value) {
  if (value == null || value === '') return '—'
  const key = String(value).trim().toLowerCase()
  return PRIORITY_ES[key] || String(value)
}

function toStatusEs(value) {
  if (value == null || value === '') return '—'
  const key = String(value).trim().toLowerCase()
  return STATUS_ES[key] || String(value)
}

function paintCells(row, colCount, { font, fill, alignment }) {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i)
    if (font) cell.font = font
    if (fill) cell.fill = fill
    if (alignment) cell.alignment = alignment
  }
}

function styleHeader(row, argb, colCount) {
  paintCells(row, colCount, {
    font: { bold: true, color: { argb: 'FFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).border = {
      bottom: { style: 'thin', color: { argb: 'FFFFFF' } },
    }
  }
  row.height = 22
}

function styleTitle(sheet, title, subtitle, argb, colCount) {
  sheet.mergeCells(1, 1, 1, colCount)
  paintCells(sheet.getRow(1), colCount, {
    font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  sheet.getCell(1, 1).value = title
  sheet.getRow(1).height = 30

  sheet.mergeCells(2, 1, 2, colCount)
  paintCells(sheet.getRow(2), colCount, {
    font: { size: 10, italic: true, color: { argb: 'F1F5F9' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  sheet.getCell(2, 1).value = subtitle
  sheet.getRow(2).height = 20
}

/** Fila de “sin datos”: celdas fusionadas, centrada y con estilo suave */
function addEmptyStateRow(sheet, message, colCount) {
  const rowNumber = sheet.rowCount + 1
  sheet.mergeCells(rowNumber, 1, rowNumber, colCount)
  const row = sheet.getRow(rowNumber)
  row.getCell(1).value = message
  paintCells(row, colCount, {
    font: { italic: true, size: 11, color: { argb: '64748B' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  row.height = 26
  return row
}

function zebra(row, index, colCount) {
  if (index % 2 !== 1) return
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F8FAFC' },
    }
  }
}

function alignCenter(row, colCount) {
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).alignment = {
      ...(row.getCell(i).alignment || {}),
      vertical: 'middle',
      horizontal: 'center',
    }
  }
}

async function buildReportExcelBuffer(report) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Mi Dinero+'
  workbook.company = 'Meta Autos Medellín · SENA ADSO'
  workbook.created = new Date()

  const isMonthly = report.period.type === 'monthly'
  const title = isMonthly ? 'Reporte mensual' : 'Reporte semanal'
  const periodLabel = `${report.period.startDate} → ${report.period.endDate}`
  const subtitle = `${report.user.fullName} · ${periodLabel}`

  const PURPLE = '7C3AED'
  const BLUE = '2563EB'
  const GREEN = '16A34A'
  const RED = 'DC2626'

  // ========== RESUMEN ==========
  const resumen = workbook.addWorksheet('Resumen', {
    properties: { tabColor: { argb: PURPLE } },
  })
  resumen.columns = [
    { key: 'campo', width: 30 },
    { key: 'valor', width: 42 },
  ]
  styleTitle(resumen, `Mi Dinero+ · ${title}`, subtitle, PURPLE, 2)

  const headerResumen = resumen.getRow(4)
  headerResumen.values = ['Campo', 'Valor']
  styleHeader(headerResumen, '5B21B6', 2)

  const tx = report.transactions
  const resumenData = [
    ['Usuario', report.user.fullName],
    ['Correo', report.user.email],
    ['Tipo de reporte', title],
    ['Periodo', periodLabel],
    ['', ''],
    ['Ingresos (COP)', money(tx.totalIncome)],
    ['Cantidad de ingresos', tx.incomeCount],
    ['Gastos (COP)', money(tx.totalExpense)],
    ['Cantidad de gastos', tx.expenseCount],
    ['Balance neto (COP)', money(tx.netBalance)],
    ['', ''],
    ['Metas registradas', (report.goals || []).length],
    ['Deudas registradas', (report.debts || []).length],
  ]

  resumenData.forEach((r, i) => {
    const row = resumen.addRow({ campo: r[0], valor: r[1] })
    zebra(row, i, 2)
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' }

    if (typeof r[1] === 'number' && String(r[0]).includes('COP')) {
      row.getCell(2).numFmt = '"$"#,##0'
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' }
    }
    if (typeof r[1] === 'number' && !String(r[0]).includes('COP') && r[0]) {
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' }
    }
    if (r[0] === 'Balance neto (COP)') {
      row.getCell(2).font = {
        bold: true,
        color: { argb: money(tx.netBalance) >= 0 ? GREEN : RED },
      }
    }
  })

  // ========== TRANSACCIONES ==========
  const hojaTx = workbook.addWorksheet('Transacciones', {
    properties: { tabColor: { argb: BLUE } },
  })
  hojaTx.columns = [
    { key: 'fecha', width: 14 },
    { key: 'tipo', width: 12 },
    { key: 'descripcion', width: 36 },
    { key: 'categoria', width: 18 },
    { key: 'monto', width: 16 },
  ]
  styleTitle(hojaTx, 'Transacciones del periodo', subtitle, BLUE, 5)

  const headerTx = hojaTx.getRow(4)
  headerTx.values = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto COP']
  styleHeader(headerTx, '1D4ED8', 5)

  const items = report.transactions.items || []
  if (items.length === 0) {
    addEmptyStateRow(hojaTx, 'Sin transacciones en el periodo', 5)
  } else {
    items.forEach((t, i) => {
      const row = hojaTx.addRow({
        fecha: formatDateCell(t.date),
        tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
        descripcion: t.description || '',
        categoria: t.category || '',
        monto: money(t.amount),
      })
      zebra(row, i, 5)
      alignCenter(row, 5)
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' }
      row.getCell(5).numFmt = '"$"#,##0'
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' }
      row.getCell(2).font = {
        bold: true,
        color: { argb: t.type === 'income' ? GREEN : RED },
      }
    })
  }

  // ========== METAS ==========
  const hojaMetas = workbook.addWorksheet('Metas', {
    properties: { tabColor: { argb: GREEN } },
  })
  hojaMetas.columns = [
    { key: 'nombre', width: 28 },
    { key: 'actual', width: 14 },
    { key: 'objetivo', width: 14 },
    { key: 'pct', width: 12 },
    { key: 'estado', width: 14 },
    { key: 'deadline', width: 14 },
    { key: 'prioridad', width: 12 },
  ]
  styleTitle(hojaMetas, 'Metas de ahorro', subtitle, GREEN, 7)

  const headerMetas = hojaMetas.getRow(4)
  headerMetas.values = [
    'Meta',
    'Actual COP',
    'Objetivo COP',
    'Avance %',
    'Estado',
    'Fecha límite',
    'Prioridad',
  ]
  styleHeader(headerMetas, '15803D', 7)

  const goals = report.goals || []
  if (goals.length === 0) {
    addEmptyStateRow(hojaMetas, 'Sin metas registradas', 7)
  } else {
    goals.forEach((g, i) => {
      const row = hojaMetas.addRow({
        nombre: g.name,
        actual: money(g.current),
        objetivo: money(g.target),
        pct: g.pct,
        estado: toStatusEs(g.status),
        deadline: formatDateCell(g.deadline),
        prioridad: toPriorityEs(g.priority),
      })
      zebra(row, i, 7)
      alignCenter(row, 7)
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
      row.getCell(2).numFmt = '"$"#,##0'
      row.getCell(3).numFmt = '"$"#,##0'
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' }
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' }
      row.getCell(4).numFmt = '0"%"'
    })
  }

  // ========== DEUDAS ==========
  const hojaDeudas = workbook.addWorksheet('Deudas', {
    properties: { tabColor: { argb: RED } },
  })
  hojaDeudas.columns = [
    { key: 'nombre', width: 32 },
    { key: 'total', width: 14 },
    { key: 'pendiente', width: 16 },
    { key: 'vence', width: 14 },
    { key: 'dias', width: 14 },
    { key: 'estado', width: 12 },
    { key: 'interes', width: 14 },
  ]
  styleTitle(hojaDeudas, 'Gestión de deudas', subtitle, RED, 7)

  const headerDeudas = hojaDeudas.getRow(4)
  headerDeudas.values = [
    'Deuda',
    'Total COP',
    'Pendiente COP',
    'Vence',
    'Días restantes',
    'Estado',
    'Interés % mes',
  ]
  styleHeader(headerDeudas, 'B91C1C', 7)

  const debts = report.debts || []
  if (debts.length === 0) {
    addEmptyStateRow(hojaDeudas, 'Sin deudas registradas', 7)
  } else {
    debts.forEach((d, i) => {
      const row = hojaDeudas.addRow({
        nombre: d.name,
        total: money(d.total),
        pendiente: money(d.pending),
        vence: formatDateCell(d.dueDate),
        dias: d.daysLeft != null ? d.daysLeft : '',
        estado: toStatusEs(d.status),
        interes: d.interestRate != null ? Number(d.interestRate) : 0,
      })
      zebra(row, i, 7)
      alignCenter(row, 7)
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
      row.getCell(2).numFmt = '"$"#,##0'
      row.getCell(3).numFmt = '"$"#,##0'
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' }
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' }
      if (d.daysLeft != null && d.daysLeft < 0) {
        row.getCell(5).font = { bold: true, color: { argb: RED } }
      }
    })
  }

  ;[resumen, hojaTx, hojaMetas, hojaDeudas].forEach((sh) => {
    sh.views = [{ state: 'frozen', ySplit: 4 }]
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function excelFilename(report) {
  const tipo = report.period.type === 'monthly' ? 'mensual' : 'semanal'
  const end = report.period.endDate || 'periodo'
  return `MiDinero_reporte_${tipo}_${end}.xlsx`
}

module.exports = {
  buildReportExcelBuffer,
  excelFilename,
}