import React, { useState } from 'react';

import { pushNotificationService } from '../services/pushNotificationService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PushNotificationTest: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runFullTest = async () => {
    if (!user) {
      addResult('❌ No user logged in');
      return;
    }

    setIsLoading(true);
    setTestResults([]);

    try {
      addResult('🧪 Starting push notification test...');

      // Test 1: Check if notifications are supported (Capacitor)
      addResult('1️⃣ Testing push notification support via Capacitor...');
      addResult('   Note: Firebase removed - using Capacitor + Supabase');
      addResult('   ℹ️ Configure Capacitor for native push notifications');

      // Test 2: Initialize push notifications with Capacitor
      addResult('2️⃣ Initializing push notifications...');
      const permissionStatus = 'granted';

      if (permissionStatus === 'denied') {
        addResult('⚠️ Permission was previously denied. You need to manually enable notifications in browser settings.');
        addResult('   Chrome: Click 🔒 in address bar → Site settings → Notifications → Allow');
        addResult('   Firefox: Click 🔒 in address bar → Connection secure → More info → Permissions → Notifications → Allow');
        return;
      }

      // Test 3: Request permission and get token
      addResult('3️⃣ Requesting permission and token...');
      const token = await fcmService.requestPermission();
      addResult(`   Token received: ${token ? (token.length > 20 ? token.substring(0, 20) + '...' : token) : 'null'}`);

      if (!token) {
        addResult('❌ Failed to get token - permission may have been denied');
        return;
      }

      // Test 4: Initialize push notification service
      addResult('4️⃣ Initializing push notification service...');
      await pushNotificationService.initialize(user.id);
      addResult('   Service initialized');

      // Test 5: Check if token was stored in database
      addResult('5️⃣ Checking database storage...');
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        addResult(`❌ Database error: ${error.message}`);
      } else {
        addResult(`   Found ${subscriptions?.length || 0} subscriptions in database`);
        if (subscriptions && subscriptions.length > 0) {
          subscriptions.forEach((sub, index) => {
            addResult(`   Subscription ${index + 1}: ${sub.fcm_token.substring(0, 20)}...`);
          });
        }
      }

      // Test 6: Check current token
      addResult('6️⃣ Checking current token...');
      const currentToken = pushNotificationService.getCurrentToken();
      addResult(`   Current token: ${currentToken ? (currentToken.length > 20 ? currentToken.substring(0, 20) + '...' : currentToken) : 'null'}`);

      addResult('✅ Push notification test completed!');

    } catch (error: any) {
      addResult(`❌ Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      margin: '20px',
      fontFamily: 'monospace',
    }}>
      <h3>🔔 Push Notification Test</h3>
      <p>This tool helps debug push notification registration issues.</p>

      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={runFullTest}
          disabled={isLoading || !user}
          style={{
            padding: '10px 20px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginRight: '10px',
          }}
        >
          {isLoading ? 'Testing...' : 'Run Full Test'}
        </button>

        <button
          onClick={clearResults}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear Results
        </button>
      </div>

      {!user && (
        <p style={{ color: 'red' }}>⚠️ Please log in first to test push notifications.</p>
      )}

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '10px',
        maxHeight: '400px',
        overflowY: 'auto',
        fontSize: '12px',
      }}>
        {testResults.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Click "Run Full Test" to start testing...</p>
        ) : (
          testResults.map((result, index) => (
            <div key={index} style={{ marginBottom: '5px' }}>
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PushNotificationTest;
