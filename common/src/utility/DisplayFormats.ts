function formatDateForChart(date: Date | string): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  let hours = date.getHours();
  const amOrPm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${month}/${day} ${hours}:${minutes} ${amOrPm}`;
}

function formatDecimalReadingForDisplay(data: string): string {
  return parseFloat(data).toFixed(3);
}

export { formatDateForChart, formatDecimalReadingForDisplay };
