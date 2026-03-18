import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import path from "path"

interface StudentRow {
  first_name: string
  last_name: string
  sex: string
  birthdate: string
  parent_email: string
}

export async function POST(req: NextRequest) {
  try {
    const { students, course_name }: { students: StudentRow[]; course_name: string } = await req.json()

    const templatePath = path.join(process.cwd(), "public", "ListadoNeuroDiversión.xlsx")
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(templatePath)

    const ws = workbook.worksheets[0]
    if (!ws) return NextResponse.json({ error: "Template sheet not found" }, { status: 500 })

    // Save style from template's first sample row (row 5) before deleting
    const templateCellStyles: any[] = []
    for (let c = 1; c <= 5; c++) {
      const cell = ws.getRow(5).getCell(c)
      templateCellStyles.push(JSON.parse(JSON.stringify(cell.style ?? {})))
    }

    // Delete all sample data rows (row 5 onwards)
    const lastRowNum = ws.lastRow?.number ?? 19
    if (lastRowNum >= 5) {
      ws.spliceRows(5, lastRowNum - 4)
    }

    // Insert student rows
    students.forEach((s, idx) => {
      const row = ws.insertRow(5 + idx, [
        s.first_name,
        s.last_name,
        s.sex,
        s.birthdate,
        s.parent_email,
      ])
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).style = { ...templateCellStyles[c - 1] }
      }
      row.commit()
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `alumnos_${course_name.replace(/\s+/g, "_")}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    console.error("Export error:", err)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
