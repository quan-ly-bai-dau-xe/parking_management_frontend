export const mockHelloData = {
  title: "Hello World Application",
  subtitle: "Chào mừng bạn đến với hệ thống quản lý bãi đỗ xe",
  welcomeMessage: "Xin chào thế giới! Hệ thống đã sẵn sàng với Tailwind CSS.",
  status: "Online",
  features: [
    {
      id: 1,
      name: "Quản lý lượt gửi xe",
      description: "Theo dõi xe ra vào thời gian thực với mã thẻ và camera thông minh.",
      badge: "Active",
      color: "emerald"
    },
    {
      id: 2,
      name: "Tra cứu & Lọc nhanh",
      description: "Tìm kiếm biển số xe, chủ xe hoặc vị trí đỗ chỉ trong vài mili-giây.",
      badge: "Fast",
      color: "blue"
    },
    {
      id: 3,
      name: "Báo cáo doanh thu & Thống kê",
      description: "Tổng hợp doanh thu theo ca làm việc, ngày, tháng chi tiết và chính xác.",
      badge: "Pro",
      color: "purple"
    }
  ],
  stats: [
    { label: "Tổng chỗ đỗ", value: "1,250", change: "+5% so với hôm qua" },
    { label: "Đang đỗ hiện tại", value: "842", change: "67% công suất" },
    { label: "Lượt xe trong ngày", value: "3,120", change: "+12.4%" }
  ],
  author: {
    name: "Parking Management Team",
    version: "1.0.0",
    environment: "Development (Mock Mode)"
  }
};
