interface ExpenseSubmission {
  name: string
  lectureName: string
  tripDate: string
  fuelCost: number
  tollCost: number
  fuelLinks: string[]
  tollLinks: string[]
}

const GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeExU5c6YzElWWk2IF_5cZEilJd4mldYK-aM1tQLtobU7og0w/formResponse'

const ENTRY_IDS = {
  name: 'entry.254732787',
  lectureName: 'entry.647625590',
  tripDate: 'entry.207476044',
  fuelCost: 'entry.180956906',
  tollCost: 'entry.710460679',
  fuelLinks: 'entry.869282948',
  tollLinks: 'entry.867110150',
} as const

export async function saveToGoogleSheets(data: ExpenseSubmission): Promise<boolean> {
  try {
    const formData = new URLSearchParams()
    formData.append(ENTRY_IDS.name, data.name)
    formData.append(ENTRY_IDS.lectureName, data.lectureName)
    formData.append(ENTRY_IDS.tripDate, data.tripDate)
    formData.append(ENTRY_IDS.fuelCost, String(data.fuelCost))
    formData.append(ENTRY_IDS.tollCost, String(data.tollCost))
    if (data.fuelLinks?.length) {
      formData.append(ENTRY_IDS.fuelLinks, data.fuelLinks.join('\n'))
    }
    if (data.tollLinks?.length) {
      formData.append(ENTRY_IDS.tollLinks, data.tollLinks.join('\n'))
    }

    const response = await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    // Google Form은 제출 성공 시 200 또는 302를 반환
    return response.ok || response.status === 302
  } catch (error) {
    console.error('Google Form 제출 오류:', error)
    return false
  }
}
