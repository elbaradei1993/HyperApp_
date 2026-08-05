import React, { useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { pushNotificationService } from '../services/pushNotificationService';

const PushNotificationTest: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults((previous) => [...previous, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runFullTest = async () => {
    if (!user) {
      addResult('No user is signed in.');
      return;
    }

    setIsLoading(true);
    setTestResults([]);
    try {
      addResult('Initializing the configured Capacitor push service...');
      await pushNotificationService.initialize(user.id);
      const token = pushNotificationService.getCurrentToken();
      addResult(token ? 'A push token is available.' : 'No push token is available on this platform.');

      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id);
      if (error) {
        addResult(`Database check failed: ${error.message}`);
      } else {
        addResult(`Stored subscriptions: ${subscriptions?.length || 0}`);
      }
      addResult('Push notification test completed.');
    } catch (error) {
      addResult(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section style={{ padding: 20, backgroundColor: '#f5f5f5', borderRadius: 8, margin: 20 }}>
      <h3>Push notification test</h3>
      <p>This tool checks the active Capacitor and Supabase push configuration.</p>
      <button type="button" onClick={() => void runFullTest()} disabled={isLoading || !user}>
        {isLoading ? 'Testing...' : 'Run full test'}
      </button>{' '}
      <button type="button" onClick={() => setTestResults([])}>Clear results</button>
      {!user && <p role="alert">Sign in before testing push notifications.</p>}
      <div aria-live="polite" style={{ marginTop: 12 }}>
        {testResults.map((result) => <div key={result}>{result}</div>)}
      </div>
    </section>
  );
};

export default PushNotificationTest;
