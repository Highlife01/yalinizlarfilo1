/**
 * Generates a Google Calendar "Add to Event" link.
 */
export const getGoogleCalendarLink = (event: {
    title: string;
    description: string;
    location: string;
    start: Date;
    end: Date;
}) => {
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");
    const base = "https://www.google.com/calendar/render?action=TEMPLATE";
    const text = `&text=${encodeURIComponent(event.title)}`;
    const dates = `&dates=${formatDate(event.start)}/${formatDate(event.end)}`;
    const details = `&details=${encodeURIComponent(event.description)}`;
    const location = `&location=${encodeURIComponent(event.location)}`;
    return `${base}${text}${dates}${details}${location}`;
};

/**
 * Creates a calendar reminder for a vehicle rental/delivery.
 */
export const createRentalCalendarLink = (booking: {
    customerName: string;
    customerPhone: string;
    vehiclePlate: string;
    startDate: string;
    pickupBranch: string;
}) => {
    const start = new Date(booking.startDate);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

    return getGoogleCalendarLink({
        title: `Teslimat: ${booking.vehiclePlate} - ${booking.customerName}`,
        description: `Müşteri: ${booking.customerName}\nTelefon: ${booking.customerPhone}\nAraç: ${booking.vehiclePlate}`,
        location: booking.pickupBranch || "Yalınızlar Filo",
        start,
        end
    });
};
