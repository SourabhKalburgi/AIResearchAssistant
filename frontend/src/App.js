import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import "./App.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB file size limit

const App = () => {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filePath, setFilePath] = useState(null); // Store uploaded file path
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const { getRootProps, getInputProps } = useDropzone({
    accept: "application/pdf",
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("File size exceeds 5MB. Please upload a smaller file.");
        return;
      }
      setFile(selectedFile);
      setError("");
    },
  });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSummary(response.data.summary);
      setFilePath(response.data.filepath); // Store the uploaded file path
      localStorage.setItem("uploadedFilePath", response.data.filepath); // Save path in local storage
    } catch (error) {
      console.error("Error uploading file", error);
      setError("An error occurred while processing the file.");
    }
    setLoading(false);
  };

  const handleRemoveFile = async () => {
    if (filePath) {
      try {
        await axios.post("http://127.0.0.1:5000/delete", { filepath: filePath });
      } catch (error) {
        console.error("Error deleting file", error);
      }
    }
    setFile(null);
    setSummary("");
    setFilePath(null);
    setError("");
    setAnswer("");
    localStorage.removeItem("uploadedFilePath"); // Remove from local storage
  };

  const handleAskQuestion = async () => {
    if (!question) return;
    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:5000/ask", {
        question,
        filepath: filePath,
      });
      setAnswer(response.data.answer);
    } catch (error) {
      console.error("Error processing question", error);
      setError("An error occurred while answering the question.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const cleanupFile = async () => {
      const storedFilePath = localStorage.getItem("uploadedFilePath");
      if (storedFilePath) {
        try {
          await axios.post("http://127.0.0.1:5000/delete", { filepath: storedFilePath });
          localStorage.removeItem("uploadedFilePath");
        } catch (error) {
          console.error("Error deleting file on unload", error);
        }
      }
    };

    window.addEventListener("beforeunload", cleanupFile);
    return () => {
      window.removeEventListener("beforeunload", cleanupFile);
    };
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1>AI Research Assistant</h1>
        <p className="instructions">Upload a PDF file to get a summarized version of its contents. You can also ask follow-up questions based on the PDF.</p>
        <div {...getRootProps()} className="dropzone">
          <input {...getInputProps()} />
          {file ? <p>{file.name}</p> : <p>Drag & drop a PDF file here or click to select</p>}
        </div>
        {error && <p className="error">{error}</p>}
        {file && <button onClick={handleRemoveFile} className="remove-btn">Remove PDF</button>}
        <button onClick={handleUpload} className="upload-btn" disabled={loading || !file}>
          {loading ? "Processing..." : "Upload & Summarize"}
        </button>
        {summary && (
          <div className="summary-box">
            <h2>Summary:</h2>
            <p>{summary}</p>
          </div>
        )}
        {summary && (
          <div className="question-box">
            <input
              type="text"
              placeholder="Ask a follow-up question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button onClick={handleAskQuestion} className="ask-btn" disabled={loading || !question}>
              Ask
            </button>
          </div>
        )}
        {answer && (
          <div className="answer-box">
            <h2>Answer:</h2>
            <p>{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;