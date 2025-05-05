import { useState } from "react"
import { Calendar, Clock } from "lucide-react"

interface DateTimeSelectionProps {
  formData: {
    date: string
    time: string
    [key: string]: string
  }
  updateFormData: (data: Partial<{ date: string; time: string }>) => void
}

export default function DateTimeSelection({ formData, updateFormData }: DateTimeSelectionProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Generate dates for the current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Available time slots
  const timeSlots = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
  ]

  // Generate calendar days
  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null) // Empty cells for days before the 1st of the month
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    updateFormData({ date: selectedDate })
  }

  const isDateInPast = (day: number) => {
    const today = new Date()
    const selectedDate = new Date(year, month, day)
    return selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Choose Date & Time</h2>
        <p className="mt-1 text-sm text-gray-500">Select when you'd like to visit us</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Calendar className="mr-2 h-4 w-4" />
            Select Date
          </label>
          <div className="flex items-center space-x-2">
            <button type="button" onClick={handlePrevMonth} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium">
              {monthNames[month]} {year}
            </span>
            <button type="button" onClick={handleNextMonth} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="grid grid-cols-7 bg-gray-50 text-center">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className="py-2 text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {days.map((day, index) => (
              <div key={index} className={`bg-white p-2 ${!day ? "cursor-default" : "cursor-pointer"}`}>
                {day && (
                  <button
                    type="button"
                    disabled={isDateInPast(day)}
                    onClick={() => handleDateSelect(day)}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${isDateInPast(day)
                        ? "cursor-not-allowed text-gray-300"
                        : formData.date ===
                          `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                          ? "bg-rose-500 text-white"
                          : "hover:bg-rose-100"
                      }`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-center text-sm font-medium text-gray-700">
          <Clock className="mr-2 h-4 w-4" />
          Select Time
        </label>
        <div className="grid grid-cols-3 gap-2">
          {timeSlots.map((time) => (
            <button
              key={time}
              type="button"
              disabled={!formData.date}
              onClick={() => updateFormData({ time })}
              className={`rounded-md border p-2 text-center text-sm transition-colors ${!formData.date
                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
                  : formData.time === time
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-gray-200 hover:border-rose-200 hover:bg-rose-50/50"
                }`}
            >
              {time}
            </button>
          ))}
        </div>
        {!formData.date && <p className="text-xs text-gray-500">Please select a date first</p>}
      </div>
    </div>
  )
}

// Import for the ChevronLeft and ChevronRight icons
import { ChevronLeft, ChevronRight } from "lucide-react"
