import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, TextField, InputAdornment } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { MessageList, Message } from 'react-chat-elements';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const chatRef = useRef(null);

  const handleSend = async (e) => {
    if (e.key === 'Enter' && input.trim()) {
      const newMessage = {
        position: 'right',
        type: 'text',
        text: input,
        date: new Date(),
      };

      setMessages([...messages, newMessage]);
      setInput('');

      try {
        const response = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: input }),
        });

        const data = await response.json();
        const botMessage = {
          position: 'left',
          type: 'text',
          text: data.response,
          date: new Date(),
        };

        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  useEffect(() => {
    chatRef.current?.scrollToBottom();
  }, [messages]);

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Server Management Assistant
      </Typography>
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <MessageList
          ref={chatRef}
          messages={messages}
          lockable={false}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleSend}
          placeholder="Type your message..."
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => handleSend({ key: 'Enter' })}>
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Paper>
  );
};

export default Chat;
