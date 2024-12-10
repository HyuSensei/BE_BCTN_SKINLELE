import moment from "moment";

export const getDayNumber = (dayOfWeek) => {
  const days = {
    "Thứ 2": 1,
    "Thứ 3": 2,
    "Thứ 4": 3,
    "Thứ 5": 4,
    "Thứ 6": 5,
    "Thứ 7": 6,
    "Chủ nhật": 0,
  };
  return days[dayOfWeek];
};

export const generateAvailableTimeSlots = (
  startTime,
  endTime,
  duration,
  breakTime,
  bookings
) => {
  const slots = [];
  let currentTime = moment(startTime, "HH:mm");
  const endTimeObj = moment(endTime, "HH:mm");

  // Check if startTime is after current time for today
  const isToday = moment().isSame(moment(), "day");
  if (isToday) {
    const now = moment();
    if (currentTime.isBefore(now)) {
      currentTime = moment(now).minutes(
        Math.ceil(now.minutes() / duration) * duration
      );
    }
  }

  while (currentTime.isBefore(endTimeObj)) {
    const slotTime = currentTime.format("HH:mm");
    const slotEndTime = currentTime.clone().add(duration, "minutes");

    // Skip break time
    if (
      breakTime &&
      ((slotTime >= breakTime.start && slotTime < breakTime.end) ||
        (slotEndTime.format("HH:mm") > breakTime.start &&
          slotEndTime.format("HH:mm") <= breakTime.end))
    ) {
      currentTime.add(duration, "minutes");
      continue;
    }

    // Check if slot is available
    const isBooked = bookings.some(
      (booking) =>
        booking.startTime === slotTime ||
        (moment(booking.startTime, "HH:mm").isBefore(slotEndTime) &&
          moment(booking.endTime, "HH:mm").isAfter(currentTime))
    );

    if (!isBooked) {
      slots.push({
        startTime: slotTime,
        endTime: slotEndTime.format("HH:mm"),
      });
    }

    currentTime.add(duration, "minutes");
  }

  return slots;
};
