const sensitiveKeywords = [
    'gián điệp', 'mật mã', 'trinh sát', 'tội phạm', 'biện pháp nghiệp vụ',
    'biểu tình', 'tụ tập đông người', 'bạo loạn', 'gây rối trật tự',
    'biểu tình 2015', 'biểu tình 2016', 'biểu tình 2017', 'biểu tình 2018', 
    'biểu tình 2019', 'biểu tình 2020', 'biểu tình 2021', 'biểu tình 2022', 
    'biểu tình 2023', 'biểu tình 2024', 'biểu tình 2025', 'biểu tình 2026',
    'formosa', 'luật đặc khu', 'an ninh mạng biểu tình', 'kích động'
];

function checkSecurityViolation(text) {
    const lower = text.toLowerCase();
    return sensitiveKeywords.find(kw => lower.includes(kw));
}
