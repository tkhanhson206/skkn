
import { GoogleGenAI, Type } from "@google/genai";
import { SKKNInput, RefinementLevel, SKKNAudit } from "../types";

// Initialize the Google GenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const skknSchema = {
  type: Type.OBJECT,
  properties: {
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ['id', 'title', 'content']
      }
    },
    evidenceChecklist: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          purpose: { type: Type.STRING }
        }
      }
    }
  },
  required: ['sections', 'evidenceChecklist']
};

const auditSchema = {
  type: Type.OBJECT,
  properties: {
    totalScore: { type: Type.NUMBER },
    criteria: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          score: { type: Type.NUMBER },
          maxScore: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        },
        required: ['label', 'score', 'maxScore', 'feedback']
      }
    },
    overallAdvice: { type: Type.STRING },
    prizePrediction: { type: Type.STRING }
  },
  required: ['totalScore', 'criteria', 'overallAdvice', 'prizePrediction']
};

const refinementSchema = {
  type: Type.OBJECT,
  properties: {
    newContent: { type: Type.STRING },
    comment: { type: Type.STRING }
  },
  required: ['newContent', 'comment']
};

export const generateSKKNContent = async (input: SKKNInput): Promise<any> => {
  const prompt = `
    Bạn là CHỦ TỊCH HỘI ĐỒNG CHẤM THI SKKN CẤP QUỐC GIA. Hãy chắp bút một bản Sáng kiến kinh nghiệm SIÊU ĐỘT PHÁ để đạt GIẢI NHẤT.
    
    THÔNG TIN: Môn ${input.subject}, Lớp ${input.grade}, Đề tài: "${input.topic}".
    PHONG CÁCH: "${input.style}".
    
    YÊU CẦU ĐẠT GIẢI NHẤT:
    1. TÍNH MỚI: Sử dụng công cụ Google Search để tìm và đưa vào các xu hướng giáo dục thực tế nhất năm 2024-2025. Phải đề cập đến các văn bản chỉ đạo mới nhất của Bộ GD&ĐT trong năm học này.
    2. TÍNH KHOA HỌC: Lập luận theo phương pháp nghiên cứu hành động (Action Research).
    3. TÍNH THỰC TIỄN: Các giải pháp phải cực kỳ chi tiết, có "tình huống sư phạm" thực tế và cách xử lý.
    4. BẢNG BIỂU: Tạo các bảng số liệu đối chứng phức tạp, bao gồm cả khảo sát định lượng và định tính.
    
    Cấu trúc bài viết phải dài trên 20 trang, văn phong sắc bén, giàu tính nhân văn nhưng cực kỳ khoa học.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }], // Tích hợp Search để lấy xu hướng 2025
      responseMimeType: "application/json",
      responseSchema: skknSchema,
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  // Trích xuất URL từ grounding metadata nếu có
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  console.log("Cơ sở thực tế từ Google Search:", groundingChunks);

  return JSON.parse(response.text || "{}");
};

// Fix: Added the missing refineSKKNSection function to handle content upgrades.
export const refineSKKNSection = async (
  topic: string,
  sectionTitle: string,
  content: string,
  level: RefinementLevel,
  instruction?: string
): Promise<{ newContent: string; comment: string }> => {
  const prompt = `
    Bạn là chuyên gia tư vấn Sáng kiến kinh nghiệm (SKKN). Hãy nâng cấp nội dung phần "${sectionTitle}" cho đề tài: "${topic}".
    
    Nội dung hiện tại:
    "${content}"
    
    Mức độ nâng cấp mong muốn: "${level}"
    Yêu cầu bổ sung của tác giả: "${instruction || 'Không có'}"
    
    YÊU CẦU:
    - Viết lại phần này một cách chuyên sâu, hàn lâm và khoa học.
    - Đưa vào các ví dụ thực tiễn sống động, số liệu minh họa và giải pháp sáng tạo đột phá.
    - Đảm bảo ngôn ngữ sắc bén, giàu tính nhân văn và đúng quy chuẩn của Bộ GD&ĐT.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: refinementSchema,
      thinkingConfig: { thinkingBudget: 15000 }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const auditSKKN = async (topic: string, fullContent: string): Promise<SKKNAudit> => {
  const prompt = `
    Đóng vai GIÁM KHẢO KHÓ TÍNH NHẤT. Hãy "soi" lỗi và thẩm định bài viết này để giúp tác giả đạt GIẢI NHẤT.
    Đề tài: "${topic}".
    Nội dung: "${fullContent.substring(0, 20000)}".
    
    Yêu cầu:
    - Tìm ra 3 điểm yếu lớn nhất có thể bị trừ điểm.
    - Chấm điểm dựa trên thang 100 của Bộ GD&ĐT.
    - Dự đoán giải thưởng: Giải Nhất/Nhì/Ba.
    - Đưa ra lời khuyên "vàng" để nâng tầm từ giải Nhì lên giải Nhất.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: auditSchema,
      thinkingConfig: { thinkingBudget: 20000 }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateInfographicPrompt = async (solution: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Tạo một mô tả hình ảnh chi tiết để vẽ sơ đồ quy trình cho giải pháp sư phạm sau: "${solution}". Mô tả bằng tiếng Anh để AI vẽ hình.`
  });
  return response.text || "";
};

export const generateVisualAid = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `A professional educational infographic or diagram for a Vietnamese pedagogical initiative. Style: Clean, flat design, academic. Context: ${prompt}` }]
    },
    config: {
      imageConfig: { aspectRatio: "16:9" }
    }
  });

  // Iterate through all parts to find the image part as per guidelines.
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  return "";
};
