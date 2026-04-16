"use client"

import { createContext, useContext } from "react"

export interface ProgressMetric {
  section_id: number
  section_name: string
  section_order: number
  section_progress_percentage: number
  dynamic_percentage: number
  has_star: boolean
  activities_attempted: number
  total_activities: number
}

export interface StudentInfo {
  first_name: string
  last_name: string
  institution_name?: string | null
}

export interface NnaPermissions {
  can_edit_profile: boolean
  can_view_activities: boolean
}

export interface NnaContextType {
  student: StudentInfo | null
  metrics: ProgressMetric[]
  permissions: NnaPermissions | null
  dataLoading: boolean
  refreshMetrics: () => void
}

export const NnaContext = createContext<NnaContextType>({
  student: null,
  metrics: [],
  permissions: null,
  dataLoading: true,
  refreshMetrics: () => {},
})

export const useNnaContext = () => useContext(NnaContext)
