/**
 * Data sources catalog for food and nutrition information in H1T MICRO.
 * Every source code recognized by foodSourceLabel has a corresponding entry here.
 */

export interface DataSourceItem {
  id: string;
  name: string;
  description: string;
}

export const DATA_SOURCES: DataSourceItem[] = [
  {
    id: "usda",
    name: "USDA FoodData Central (Hoa Kỳ)",
    description: "Bộ Nông nghiệp Hoa Kỳ; nguồn vi chất chuẩn cho thực phẩm quốc tế.",
  },
  {
    id: "cnf",
    name: "CNF (Canada)",
    description: "Tệp Dinh dưỡng Canada (Canadian Nutrient File); dữ liệu phân tích thực phẩm từ Bộ Y tế Canada.",
  },
  {
    id: "vn-fct",
    name: "Bảng thành phần thực phẩm Việt Nam",
    description: "Viện Dinh dưỡng Quốc gia Việt Nam; số liệu dinh dưỡng cho các món ăn và nguyên liệu địa phương.",
  },
  {
    id: "custom",
    name: "Của tôi",
    description: "Món ăn và nguyên liệu do bạn tự tạo từ nhãn dinh dưỡng bao bì.",
  },
];

export const DATA_READING_GUIDE = {
  title: "Cách đọc số liệu",
  bullet1: "Ký hiệu “—” nghĩa là chưa có dữ liệu từ nguồn phân tích, không phải bằng 0.",
  bullet2: "Vi chất chưa có dữ liệu không được tính là 0 trong tổng ngày, tránh làm sai lệch đánh giá dinh dưỡng.",
};
