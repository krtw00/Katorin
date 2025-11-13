import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';

const { Title } = Typography;

const LeagueInput: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (values: {
    teamName: string;
    playerName: string;
    deck: string;
    matchRecord: string;
    teamRecord: string;
  }) => {
    setLoading(true);
    // In a real application, you would send this data to a backend or state management
    console.log(values);

    setTimeout(() => {
      message.success('Data submitted successfully (check console for mock data)');
      form.resetFields();
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: 8 }}>
        <Title level={2}>League Data Input</Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Team Name"
            name="teamName"
            rules={[{ required: true, message: 'Please input team name!' }]}
          >
            <Input placeholder="Enter team name" />
          </Form.Item>

          <Form.Item
            label="Player Name"
            name="playerName"
            rules={[{ required: true, message: 'Please input player name!' }]}
          >
            <Input placeholder="Enter player name" />
          </Form.Item>

          <Form.Item
            label="Deck"
            name="deck"
            rules={[{ required: true, message: 'Please input deck!' }]}
          >
            <Input placeholder="Enter deck" />
          </Form.Item>

          <Form.Item
            label="Match Record (e.g., 3-1)"
            name="matchRecord"
            rules={[{ required: true, message: 'Please input match record!' }]}
          >
            <Input placeholder="e.g., 3-1" />
          </Form.Item>

          <Form.Item
            label="Team Record (e.g., 2-0)"
            name="teamRecord"
            rules={[{ required: true, message: 'Please input team record!' }]}
          >
            <Input placeholder="e.g., 2-0" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Submit Data
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LeagueInput;
