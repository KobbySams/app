
import { GoogleGenAI, Type } from "@google/genai";
import { AttendanceRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeAttendance = async (records: AttendanceRecord[], courseName: string) => {
  const prompt = `
    Analyze the following class attendance data for the course "${courseName}".
    Identify students with perfect attendance, students who are at high risk due to being marked "absent" manually or missing sessions, and identify any patterns.
    
    Data (includes status which can be 'present' or 'absent'):
    ${JSON.stringify(records.map(r => ({ name: r.studentName, date: r.timestamp, status: r.status })))}
    
    Format the response as a professional report for a lecturer with:
    - Executive Summary
    - Students at Risk (High priority)
    - Participation Trends
    - Recommended Actions
    
    Use clear markdown formatting with bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze attendance data. Please check your connection and API key.";
  }
};

export const extractStudentIdDetails = async (base64Image: string) => {
  const prompt = "Extract the 'Full Name' and 'Student ID Number' from this student identification card. Return the result strictly as a JSON object with keys 'name' and 'studentId'. If you cannot find the details, return an empty object.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            studentId: { type: Type.STRING }
          }
        }
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("OCR Extraction Error:", error);
    return null;
  }
};
