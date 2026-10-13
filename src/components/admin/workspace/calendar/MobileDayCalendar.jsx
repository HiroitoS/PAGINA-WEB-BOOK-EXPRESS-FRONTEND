import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";

export default function MobileDayCalendar({ events, initialDate, onDateClick, onEventClick, renderEventContent }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-2">
      <FullCalendar
        key={`mobile-day-${initialDate}`}
        allDaySlot={false}
        contentHeight={520}
        dateClick={onDateClick}
        dayHeaderFormat={{
          weekday: "long",
          day: "2-digit",
          month: "short",
        }}
        eventClick={onEventClick}
        eventContent={renderEventContent}
        eventDisplay="block"
        eventMaxStack={2}
        eventMinHeight={22}
        eventShortHeight={22}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: "short",
        }}
        events={events}
        expandRows
        headerToolbar={{
          left: "prev,next",
          center: "title",
          right: "",
        }}
        initialDate={initialDate}
        initialView="timeGridDay"
        locale="es"
        nowIndicator
        plugins={[classicThemePlugin, timeGridPlugin, interactionPlugin]}
        slotDuration="00:30:00"
        slotEventOverlap={false}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: "short",
        }}
        slotLabelInterval="01:00:00"
        slotMaxTime="21:00:00"
        slotMinTime="07:00:00"
      />
    </div>
  );
}
