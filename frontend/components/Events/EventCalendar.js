'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import EventCard from './EventCard'
import styles from './EventCalendar.module.css'

export default function EventCalendar({ events = [], onEventUpdate }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month' or 'week'
  
  const { isAuthenticated } = useAuth()

  // Helper functions for date manipulation
  const getMonthStart = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const day = start.getDay()
    start.setDate(start.getDate() - day) // Start from Sunday
    return start
  }

  const getMonthEnd = (date) => {
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const day = end.getDay()
    end.setDate(end.getDate() + (6 - day)) // End on Saturday
    return end
  }

  const getWeekStart = (date) => {
    const start = new Date(date)
    const day = start.getDay()
    start.setDate(start.getDate() - day)
    return start
  }

  const getWeekEnd = (date) => {
    const end = new Date(date)
    const day = end.getDay()
    end.setDate(end.getDate() + (6 - day))
    return end
  }

  // Generate calendar dates
  const calendarDates = useMemo(() => {
    const dates = []
    const start = viewMode === 'month' ? getMonthStart(currentDate) : getWeekStart(currentDate)
    const end = viewMode === 'month' ? getMonthEnd(currentDate) : getWeekEnd(currentDate)
    
    const current = new Date(start)
    while (current <= end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }, [currentDate, viewMode])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = {}
    events.forEach(event => {
      const eventDate = new Date(event.event_date)
      const dateKey = eventDate.toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    return grouped
  }, [events])

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = selectedDate.toDateString()
    return eventsByDate[dateKey] || []
  }, [selectedDate, eventsByDate])

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  // Check if date is today
  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  // Check if date is selected
  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(isSelected(date) ? null : date)
  }

  // Format date for display
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const formatWeekRange = (date) => {
    const start = getWeekStart(date)
    const end = getWeekEnd(date)
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
    } else {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`
    }
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.authMessage}>
          <p>Please log in to view the events calendar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Calendar Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>
            {viewMode === 'month' ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
          </h2>
        </div>
        
        <div className={styles.headerCenter}>
          <div className={styles.navigation}>
            <button onClick={goToPrevious} className={styles.navBtn}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <button onClick={goToToday} className={styles.todayBtn}>
              Today
            </button>
            <button onClick={goToNext} className={styles.navBtn}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendar}>
        {/* Days of week header */}
        <div className={styles.daysHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={styles.dayHeader}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar dates */}
        <div className={styles.datesGrid}>
          {calendarDates.map(date => {
            const dateEvents = eventsByDate[date.toDateString()] || []
            return (
              <div
                key={date.toISOString()}
                className={`${styles.dateCell} ${
                  !isCurrentMonth(date) ? styles.otherMonth : ''
                } ${isToday(date) ? styles.today : ''} ${
                  isSelected(date) ? styles.selected : ''
                } ${dateEvents.length > 0 ? styles.hasEvents : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className={styles.dateNumber}>
                  {date.getDate()}
                </div>
                {dateEvents.length > 0 && (
                  <div className={styles.eventIndicators}>
                    {dateEvents.slice(0, 3).map((event, index) => (
                      <div
                        key={event.id}
                        className={styles.eventDot}
                        title={event.title}
                        style={{
                          backgroundColor: getEventColor(event, index)
                        }}
                      />
                    ))}
                    {dateEvents.length > 3 && (
                      <div className={styles.moreEvents}>
                        +{dateEvents.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className={styles.selectedDateSection}>
          <div className={styles.selectedDateHeader}>
            <h3>
              Events for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </h3>
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedDate(null)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className={styles.selectedDateEvents}>
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEventUpdate={onEventUpdate}
                  compact={true}
                />
              ))
            ) : (
              <div className={styles.noEvents}>
                <i className="fas fa-calendar-day"></i>
                <p>No events scheduled for this date</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ backgroundColor: '#10b981' }}></div>
          <span>Going</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Maybe</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ backgroundColor: '#6b7280' }}></div>
          <span>No response</span>
        </div>
      </div>
    </div>
  )
}

// Helper function to get event color based on user's response
function getEventColor(event, fallbackIndex) {
  if (event.user_response) {
    switch (event.user_response) {
      case 'going':
        return '#10b981'
      case 'maybe':
        return '#f59e0b'
      case 'not_going':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }
  
  // Fallback colors for events without response
  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
  return colors[fallbackIndex % colors.length]
}