export type CalendarCreatePrefill = {
  classroomSubjectId: string
  lessonId: string
  activityId: string
  title: string
  startsAt: string
  details: string
  eventType: string
}

export function getCalendarCreatePrefill(params: URLSearchParams): CalendarCreatePrefill | null {
  if (params.get('create') !== '1') return null

  return {
    classroomSubjectId: params.get('classroomSubjectId') ?? '',
    lessonId: params.get('lessonId') ?? '',
    activityId: params.get('activityId') ?? '',
    title: params.get('title') ?? '',
    startsAt: params.get('startsAt') ?? '',
    details: params.get('details') ?? '',
    eventType: params.get('eventType') ?? '',
  }
}
