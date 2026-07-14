import { useState } from 'react';
import Groq from 'groq-sdk';

export default function TestAI() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      const groq = new Groq({
        apiKey: import.meta.env.VITE_GROQ_API_KEY,
        dangerouslyAllowBrowser: true
      });

      const completion = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          { role: "user", content: "Say 'Hello from Groq!' in exactly one sentence." }
        ],
        temperature: 0.5,
        max_tokens: 50,
      });

      setResult('SUCCESS: ' + completion.choices[0].message.content);
      
    } catch (error) {
      console.error('Full error:', error);
      setResult('ERROR: ' + error.message + '\n\n' + JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI Connection Test</h1>
      <button
        onClick={testConnection}
        disabled={loading}
        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 mb-4"
      >
        {loading ? 'Testing...' : 'Test AI Connection'}
      </button>
      <pre className="p-4 bg-gray-100 rounded-lg whitespace-pre-wrap">
        API Key: {import.meta.env.VITE_GROQ_API_KEY ? '✅ Present' : '❌ Missing'}
        {'\n\n'}
        {result || 'Click button to test'}
      </pre>
    </div>
  );
}