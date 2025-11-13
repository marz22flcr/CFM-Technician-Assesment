
import { ExamRecord } from '../types';

export const exportCsv = (records: ExamRecord[]): void => {
  if (!records.length) {
    return;
  }

  const allModuleIds = new Set<string>();
  records.forEach(r => {
    Object.keys(r.moduleResults).forEach(id => allModuleIds.add(id));
  });
  const moduleHeaders = Array.from(allModuleIds).sort();

  let headers = ['Name', 'Email/ID', 'Timestamp', 'TotalScore', 'TotalPossible'];
  moduleHeaders.forEach(mid => {
    headers.push(`Module_${mid}_Score`);
    headers.push(`Module_${mid}_Possible`);
  });

  const rows = records.map(r => {
    let row: (string | number)[] = [
      r.user.name,
      r.user.email || r.user.id,
      new Date(r.timestamp).toLocaleString(),
      r.totalScore,
      r.totalPossible
    ];

    moduleHeaders.forEach(mid => {
      const result = r.moduleResults[mid] || { score: 0, total: 0 };
      row.push(result.score);
      row.push(result.total);
    });

    return row.map(d => `"${String(d).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `cfmti_results_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
