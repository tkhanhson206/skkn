
import React, { useState, useEffect } from 'react';

const messages = [
  "Đang phân tích bối cảnh Chương trình GDPT 2018...",
  "Xây dựng cơ sở lý luận và văn bản pháp quy...",
  "Thiết lập các bảng số liệu khảo sát thực trạng...",
  "Phác thảo các giải pháp sư phạm sáng tạo...",
  "Hoàn thiện hệ thống minh chứng và phụ lục...",
  "Đang được thẩm định bởi chuyên gia AI 30 năm kinh nghiệm...",
  "Vui lòng đợi trong giây lát để có kết quả tốt nhất..."
];

export const LoadingOverlay: React.FC = () => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Chuyên gia đang chắp bút sáng kiến...</h2>
      <p className="text-blue-600 font-medium animate-pulse">{messages[msgIndex]}</p>
      <p className="mt-8 text-sm text-slate-500 max-w-md">
        Quá trình này có thể mất tới 30-60 giây để đảm bảo nội dung chi tiết và đạt chuẩn 15-17 trang A4.
      </p>
    </div>
  );
};
