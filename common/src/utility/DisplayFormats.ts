function formatDateForDisplay(date: Date | string): string {
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

function formatNumberForDisplay(value: number | string): string {
  const num = Number(value);
  if (!isFinite(num)) return String(value);
  return num.toFixed(3).replace(/\.?0+$/, "") || "0";
}

function formatTickValue(value: number | string): string {
  const num = Number(value);
  return Number(num.toFixed(2)).toString();
}

function convertCelsiusToFahrenheit(value: number | string | undefined | null): number | undefined {
  if (value == undefined || value == null) {
    return undefined;
  }
  const fahrenheitValue = (parseFloat(value.toString()) * 9) / 5 + 32;
  return Number(formatDecimalReadingForDisplay(fahrenheitValue.toString()));
}

function convertFahrenheitToCelsius(value: number | string | undefined | null): number | undefined {
  if (value == undefined || value == null) {
    return undefined;
  }
  const celsiusValue = ((parseFloat(value.toString()) - 32) * 5) / 9;
  return Number(formatDecimalReadingForDisplay(celsiusValue.toString()));
}

export {
  formatDateForDisplay,
  formatDecimalReadingForDisplay,
  formatNumberForDisplay,
  formatTickValue,
  convertCelsiusToFahrenheit,
  convertFahrenheitToCelsius,
};
