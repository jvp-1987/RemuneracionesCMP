const timeStr = "01:30";
let minutosRaw = 0;
if (timeStr.includes(':')) {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0].replace(/[^0-9]/g, '')) || 0;
  const m = parseInt(parts[1].replace(/[^0-9]/g, '')) || 0;
  minutosRaw = (h * 60) + m;
} else {
  minutosRaw = parseInt(timeStr.replace(/[^0-9]/g, '')) || 0;
}
console.log(minutosRaw);
