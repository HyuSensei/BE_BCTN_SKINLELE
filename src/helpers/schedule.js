import moment from "moment";
moment.tz.setDefault("Asia/Ho_Chi_Minh");

export const getDayNumber = (dayOfWeek) => {
  const day = moment(dayOfWeek).day();

  const daysMap = {
    0: "Chủ nhật",
    1: "Thứ 2",
    2: "Thứ 3",
    3: "Thứ 4",
    4: "Thứ 5",
    5: "Thứ 6",
    6: "Thứ 7",
  };

  return daysMap[day];
};

export const generateTimeSlots = ({
  startTime,
  endTime,
  duration,
  breakTime,
  existingBookings,
  date,
}) => {
  const slots = [];
  let currentTime = moment(startTime, "HH:mm");
  const endTimeObj = moment(endTime, "HH:mm");

  // Adjust start time if it's today and current time is after start time
  if (date.isSame(moment(), "day")) {
    const now = moment();
    if (currentTime.isBefore(now)) {
      currentTime = moment(now).add(duration, "minutes");
      currentTime.minutes(
        Math.ceil(currentTime.minutes() / duration) * duration
      );
    }
  }

  while (currentTime.isBefore(endTimeObj)) {
    const slotStart = currentTime.format("HH:mm");
    const slotEnd = moment(currentTime)
      .add(duration, "minutes")
      .format("HH:mm");

    // Skip break time slots
    if (
      breakTime &&
      ((slotStart >= breakTime.start && slotStart < breakTime.end) ||
        (slotEnd > breakTime.start && slotEnd <= breakTime.end))
    ) {
      currentTime.add(duration, "minutes");
      continue;
    }

    // Check slot availability
    const isBooked = existingBookings.some(
      (booking) =>
        (booking.startTime <= slotStart && booking.endTime > slotStart) ||
        (booking.startTime < slotEnd && booking.endTime >= slotEnd)
    );

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      isAvailable: !isBooked,
      duration,
    });

    currentTime.add(duration, "minutes");
  }

  return slots;
};
