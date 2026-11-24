// Builds a SYNTHETIC SAHR activity report for testing. Contains no real patient data.
global.XLSX = require('xlsx');
const H = ['Clinician','Service Date','Entry Date','Client URN','Client Name','Site','Service Delivery setting','Clinical Unit','Clinical Service Name','Outpatient Service Name','Client Type','Other  Client Type','Patient Contact','Attendance Type','Delivery Mode','Contact Type','Profession','Provider Type','Total Time'];
const pts = [['900000001','TESTPATIENT, ALPHA ONE'],['900000002','SAMPLE, BRAVO'],['900000003','DUMMY, CHARLIE JAMES'],['900000004','EXAMPLE, DELTA']];
const svc = ['QEH Karra Rehabilitation Unit / 069','QEH MH Psychogeriatric Open / 080','QEH Palliative Care / 072','RAH General Medicine / 101'];
const rows = [['SAHR fixture'],['Hospital: QEH'],[],H];
let d = 46329; // 2 Nov 2026
pts.forEach(([u, n], i) => {
  rows.push(['TEST, Clinician', d + i, d + i, u + '           ', n, i === 3 ? 'RAH' : 'QEH', 'Local Hospital Campus', '069', svc[i], '', 'Inpatient', '', 1, 'New', 'In person', i < 2 ? 'Group' : 'Individual', 'Music Therapy', 'AHP', 60]);
  rows.push(['TEST, Clinician', d + i + 31, d + i + 31, u, n, i === 3 ? 'RAH' : 'QEH', 'Local Hospital Campus', '069', svc[i], '', 'Inpatient', '', 1, 'Review', 'In person', 'Individual', 'Music Therapy', 'AHP', 45]);
});
rows.push(['TEST, Clinician', d, d, '900000001', 'TESTPATIENT, ALPHA ONE', 'QEH', '', '', svc[0], '', 'Inpatient', '', 0, 'Not Applicable', 'Other', 'Individual', 'Music Therapy', 'AHP', 15]);
rows.push(['TEST, Clinician', d, d, '', '', 'QEH', '', '', '', '', '', '', '', '', '', '', 'Music Therapy', 'AHP', 30]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Summary sheet']]), 'Sheet1');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet2');
XLSX.writeFile(wb, __dirname + '/SYNTHETIC_SAHR_report.xlsx');
console.log('wrote synthetic fixture');
