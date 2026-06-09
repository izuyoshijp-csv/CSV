"use client"

import type { ImportMappingConfig, ImportMappingEntry } from "@/types/firestore-models"

import {
  isCsvColumn,
  isExcelColumn,
  normalizeExcelColumn,
} from "./import-mapping-types"

export interface MappingValidationIssue {
  field: string
  message: string
  severity: "error" | "warning"
  blocking: boolean
  entryId?: string
}

function hasValue(value: unknown) {
  return String(value ?? "").trim().length > 0
}

function addIssue(
  issues: MappingValidationIssue[],
  issue: Omit<MappingValidationIssue, "severity" | "blocking">
) {
  issues.push({
    severity: "error",
    blocking: true,
    ...issue,
  })
}

function validateEntry(entry: ImportMappingEntry, index: number) {
  const issues: MappingValidationIssue[] = []
  const prefix = `entries.${index}`

  if (!entry.targetColumns.length) {
    addIssue(issues, {
      field: `${prefix}.targetColumns`,
      entryId: entry.id,
      message: "CSV列を入力してください。",
    })
  }

  entry.targetColumns.forEach((column) => {
    if (!isCsvColumn(column)) {
      addIssue(issues, {
        field: `${prefix}.targetColumns`,
        entryId: entry.id,
        message: "CSV列はAからAQまでの列名で入力してください。",
      })
    }
  })

  if (!hasValue(entry.targetColumnName)) {
    addIssue(issues, {
      field: `${prefix}.targetColumnName`,
      entryId: entry.id,
      message: "項目名を入力してください。",
    })
  }

  if (!entry.dataSource) {
    addIssue(issues, {
      field: `${prefix}.dataSource`,
      entryId: entry.id,
      message: "データ取得方法を選択してください。",
    })
  }

  if (entry.dataSource === "orderFile") {
    if (entry.orderFileMode === "fixedCell" && !hasValue(entry.sourceCell)) {
      addIssue(issues, {
        field: `${prefix}.sourceCell`,
        entryId: entry.id,
        message: "取得元セルを入力してください。",
      })
    }

    if (
      entry.orderFileMode === "fixedCell" &&
      hasValue(entry.sourceCell) &&
      !/^[A-Z]{1,3}[1-9][0-9]*$/.test(String(entry.sourceCell).toUpperCase())
    ) {
      addIssue(issues, {
        field: `${prefix}.sourceCell`,
        entryId: entry.id,
        message: "取得元セルはK4のように入力してください。",
      })
    }

    if (entry.orderFileMode === "detailColumn") {
      if (!hasValue(entry.sourceColumn) || !isExcelColumn(String(entry.sourceColumn))) {
        addIssue(issues, {
          field: `${prefix}.sourceColumn`,
          entryId: entry.id,
          message: "取得元列はExcelの列名で入力してください。",
        })
      }

      if (!Number.isInteger(entry.startRow) || Number(entry.startRow) < 1) {
        addIssue(issues, {
          field: `${prefix}.startRow`,
          entryId: entry.id,
          message: "開始行は1以上の整数で入力してください。",
        })
      }

      if (
        !hasValue(entry.endDetectionColumn) ||
        !isExcelColumn(String(entry.endDetectionColumn))
      ) {
        addIssue(issues, {
          field: `${prefix}.endDetectionColumn`,
          entryId: entry.id,
          message: "終了判定列はExcelの列名で入力してください。",
        })
      }
    }

    if (entry.orderFileMode === "sourceFormula") {
      if (!hasValue(entry.sourcePosition)) {
        addIssue(issues, {
          field: `${prefix}.sourcePosition`,
          entryId: entry.id,
          message: "取得元セル/列を入力してください。",
        })
      }

      if (!hasValue(entry.sourceFormula)) {
        addIssue(issues, {
          field: `${prefix}.sourceFormula`,
          entryId: entry.id,
          message: "計算式を入力してください。",
        })
      }
    }
  }

  if (entry.dataSource === "fixedValue" && !hasValue(entry.fixedValue)) {
    addIssue(issues, {
      field: `${prefix}.fixedValue`,
      entryId: entry.id,
      message: "固定値を入力してください。",
    })
  }

  if (entry.dataSource === "formula" && !hasValue(entry.formula)) {
    addIssue(issues, {
      field: `${prefix}.formula`,
      entryId: entry.id,
      message: "計算式を入力してください。",
    })
  }

  if (entry.dataSource === "masterLookup") {
    if (!entry.lookupCsvColumn || !isCsvColumn(entry.lookupCsvColumn)) {
      addIssue(issues, {
        field: `${prefix}.lookupCsvColumn`,
        entryId: entry.id,
        message: "参照CSV列を入力してください。",
      })
    }

    if (!hasValue(entry.lookupCollection)) {
      addIssue(issues, {
        field: `${prefix}.lookupCollection`,
        entryId: entry.id,
        message: "マスタコレクションを選択してください。",
      })
    }

    if (!hasValue(entry.lookupKeyField)) {
      addIssue(issues, {
        field: `${prefix}.lookupKeyField`,
        entryId: entry.id,
        message: "照合フィールドを選択してください。",
      })
    }

    if (!hasValue(entry.lookupValueField)) {
      addIssue(issues, {
        field: `${prefix}.lookupValueField`,
        entryId: entry.id,
        message: "取得フィールドを選択してください。",
      })
    }

    if (!entry.lookupTargetColumn || !isCsvColumn(entry.lookupTargetColumn)) {
      addIssue(issues, {
        field: `${prefix}.lookupTargetColumn`,
        entryId: entry.id,
        message: "結果CSV列を入力してください。",
      })
    }
  }

  return issues
}

export function validateImportMappingConfig(
  mapping: ImportMappingConfig,
  options: {
    existingMappings?: ImportMappingConfig[]
  } = {}
) {
  const issues: MappingValidationIssue[] = []

  if (!hasValue(mapping.name)) {
    addIssue(issues, {
      field: "name",
      message: "マッピング名を入力してください。",
    })
  } else {
    const duplicated = options.existingMappings?.some((item) => {
      return (
        item.id !== mapping.id &&
        !item.deleted &&
        String(item.name ?? "").trim().toLowerCase() ===
          String(mapping.name ?? "").trim().toLowerCase()
      )
    })

    if (duplicated) {
      addIssue(issues, {
        field: "name",
        message: "同じマッピング名は使用できません。",
      })
    }
  }

  if (mapping.startDetailRow === undefined || mapping.startDetailRow === null) {
    addIssue(issues, {
      field: "startDetailRow",
      message: "明細開始行を入力してください。",
    })
  } else if (!Number.isInteger(mapping.startDetailRow) || mapping.startDetailRow < 1) {
    addIssue(issues, {
      field: "startDetailRow",
      message: "明細開始行は1以上の整数で入力してください。",
    })
  }

  if (!hasValue(mapping.validRowColumn)) {
    addIssue(issues, {
      field: "validRowColumn",
      message: "有効行判定列を入力してください。",
    })
  } else if (!isExcelColumn(normalizeExcelColumn(mapping.validRowColumn))) {
    addIssue(issues, {
      field: "validRowColumn",
      message: "有効行判定列はExcelの列名で入力してください。",
    })
  }

  if (mapping.active && !mapping.entries.length) {
    addIssue(issues, {
      field: "entries",
      message: "マッピング設定を入力してください。",
    })
  }

  mapping.entries.forEach((entry, index) => {
    issues.push(...validateEntry(entry, index))
  })

  return {
    valid: issues.every((issue) => !issue.blocking),
    issues,
  }
}
