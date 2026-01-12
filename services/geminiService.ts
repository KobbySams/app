
import { GoogleGenAI, Type } from "@google/genai";
import { AttendanceRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Generates a comprehensive participation report using the system's analytics engine.
 */
export const generatePerformanceReport = async (records: AttendanceRecord[], courseName: string) => {
  const prompt = `
    Conduct a detailed participation audit for the course "${courseName}".
    Identify students with consistent attendance, students with irregular participation patterns, and provide statistical insights.
    
    Data:
    ${JSON.stringify(records.map(r => ({ name: r.studentName, date: r.timestamp, status: r.status })))}
    
    Format the response as a professional system-generated report with:
    - Executive Summary
    - Participation Alerts (Critical)
    - Attendance Distribution
    - Strategic Recommendations
    
    The tone must be professional and objective. Do not mention being an AI or a language model. 
    Use clear markdown formatting with bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Analytics Error:", error);
    return "The system was unable to generate the report. Please verify database connectivity.";
  }
};

/**
 * Processes ID card imagery to extract student credentials.
 */
export const processIdCredentials = async (base64Image: string) => {
  const prompt = "Extract the 'Full Name' and 'Student ID Number' from the provided identification card. Output strictly in JSON format with keys 'name' and 'studentId'.";
  
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
    console.error("Data Extraction Error:", error);
    return null;
  }
};
