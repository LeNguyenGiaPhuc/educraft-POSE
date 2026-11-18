type CalendarCreateLinkInput = {
  classroomSubjectId: string
  title: string
  details?: string
  eventType?: string
  lessonId?: string
  activityId?: string
  startsAt?: string
}

function buildCalendarCreatePath(input: CalendarCreateLinkInput): string {
  const query = new URLSearchParams({
    create: '1',
    classroomSubjectId: input.classroomSubjectId,
  })

  if (input.lessonId) query.set('lessonId', input.lessonId)
  if (input.activityId) query.set('activityId', input.activityId)
  query.set('title', input.title)
  if (input.startsAt) query.set('startsAt', input.startsAt)
  if (input.details) query.set('details', input.details)
  if (input.eventType) query.set('eventType', input.eventType)

  return `/teacher/calendar?${query.toString()}`
}

export function activityCalendarPath(input: {
  classroomSubjectId: string
  activityId: string
  title: string
  details?: string
  eventType?: string
}): string {
  return buildCalendarCreatePath({
    ...input,
    eventType: input.eventType ?? 'ACTIVITY',
  })
}

export function notebookCheckCalendarPath(input: {
  classroomSubjectId: string
  activityId: string
  title: string
  details?: string
}): string {
  return buildCalendarCreatePath({
    ...input,
    eventType: 'NOTEBOOK_CHECK',
  })
}
