import React, { useState, useEffect } from 'react';
import { Box, Text, VStack, HStack, Button, Input, Textarea, Select, Badge, Spinner, Checkbox } from '@chakra-ui/react';
import { Mail, Send, Users, Eye, Trash2, Plus, CheckSquare, Square } from 'lucide-react';

import { supabase } from '../lib/supabase';

interface MarketingEmailAdminProps {}

const MarketingEmailAdmin: React.FC<MarketingEmailAdminProps> = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customHtml, setCustomHtml] = useState('');


  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    content_html: '',
    content_text: '',
  });

  useEffect(() => {
    loadCampaigns();
    loadRecipients();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Error loading campaigns:', error.message);
    }
  };

  const loadRecipients = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_marketing_recipients', { p_limit: 100 });

      if (error) {
        throw error;
      }
      console.log('Loaded recipients:', data);
      setRecipients(data || []);
    } catch (error: any) {
      console.error('Error loading recipients:', error);
      toast({
        title: 'Error loading recipients',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.content_html) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert([{
          name: newCampaign.name,
          subject: newCampaign.subject,
          content_html: newCampaign.content_html,
          content_text: newCampaign.content_text || null,
          status: 'draft',
        }])
        .select()
        .single();

      if (campaignError) {
        throw campaignError;
      }

      // Add recipients to campaign
      const recipientInserts = recipients.map(recipient => ({
        campaign_id: campaign.id,
        user_id: recipient.user_id,
        email: recipient.email,
        status: 'pending',
      }));

      const { error: recipientError } = await supabase
        .from('email_recipients')
        .insert(recipientInserts);

      if (recipientError) {
        throw recipientError;
      }

      toast({
        title: 'Campaign created',
        description: `Campaign "${newCampaign.name}" created with ${recipients.length} recipients`,
        status: 'success',
        duration: 5000,
      });

      setNewCampaign({ name: '', subject: '', content_html: '', content_text: '' });
      setShowNewCampaign(false);
      loadCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error creating campaign',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Test email required',
        description: 'Please enter a test email address',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: { testEmail },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Test email sent',
        description: `Test email sent to ${testEmail}`,
        status: 'success',
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: 'Error sending test email',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const sendCustomEmail = async () => {
    if (selectedRecipients.size === 0) {
      toast({
        title: 'No recipients selected',
        description: 'Please select at least one recipient',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!customSubject || !customHtml) {
      toast({
        title: 'Missing content',
        description: 'Please provide both subject and HTML content',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const selectedRecipientEmails = recipients
        .filter(recipient => selectedRecipients.has(recipient.user_id))
        .map(recipient => recipient.email);

      // Send to each selected recipient individually
      const promises = selectedRecipientEmails.map(email =>
        supabase.functions.invoke('send-marketing-email', {
          body: { testEmail: email, subject: customSubject, html: customHtml },
        }),
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      toast({
        title: 'Magic link emails sent!',
        description: `Successfully sent authentication emails to ${successful} users${failed > 0 ? `, ${failed} failed` : ''}. Each email contains a secure login link.`,
        status: successful > 0 ? 'success' : 'error',
        duration: 5000,
      });

      if (successful > 0) {
        setSelectedRecipients(new Set());
        setCustomSubject('');
        setCustomHtml('');
        setShowRecipientSelector(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error sending emails',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (userId: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedRecipients(newSelected);
  };

  const selectAllRecipients = () => {
    setSelectedRecipients(new Set(recipients.map(r => r.user_id)));
  };

  const clearAllRecipients = () => {
    setSelectedRecipients(new Set());
  };

  const sendCampaign = async (campaignId: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: { campaignId },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Campaign sent',
        description: `Campaign sent to ${data.stats.successful} recipients`,
        status: 'success',
        duration: 5000,
      });

      loadCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error sending campaign',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Campaign deleted',
        status: 'success',
        duration: 3000,
      });

      loadCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error deleting campaign',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'draft': return 'gray';
    case 'scheduled': return 'blue';
    case 'sending': return 'yellow';
    case 'sent': return 'green';
    case 'failed': return 'red';
    default: return 'gray';
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack align="stretch" gap={6}>
        {/* Header */}
        <HStack justify="space-between" align="center">
          <VStack align="start" gap={1}>
            <Text fontSize="2xl" fontWeight="bold">Marketing Email Admin</Text>
            <Text color="gray.600">Manage email campaigns and send to verified users</Text>
          </VStack>
          <Button
            colorScheme="blue"
            onClick={() => setShowNewCampaign(true)}
            disabled={showNewCampaign}
          >
            <Plus size={16} style={{ marginRight: '8px' }} />
            New Campaign
          </Button>
        </HStack>

        {/* Recipients Summary */}
        <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
          <HStack gap={4}>
            <Users size={24} color="#3182ce" />
            <VStack align="start" gap={0}>
              <Text fontWeight="semibold" color="blue.800">
                {recipients.length} Verified Recipients
              </Text>
              <Text fontSize="sm" color="blue.600">
                Users who have verified their email and consented to marketing
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Test Email Section */}
        <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
          <VStack align="start" gap={3}>
            <HStack gap={2}>
              <Mail size={20} color="#d69e2e" />
              <Text fontWeight="semibold" color="yellow.800">Send Test Email</Text>
            </HStack>
            <HStack gap={3} w="full">
              <Input
                placeholder="Enter test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                type="email"
                flex={1}
              />
              <Button
                colorScheme="yellow"
                onClick={sendTestEmail}
                loading={loading}
                loadingText="Sending..."
              >
                <Send size={16} style={{ marginRight: '8px' }} />
                Send Test
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* Custom Email Section */}
        <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
          <VStack align="start" gap={3}>
            <HStack justify="space-between" align="center" w="full">
              <HStack gap={2}>
                <Users size={20} color="#38a169" />
                <Text fontWeight="semibold" color="green.800">Send Custom Email to Selected Users</Text>
              </HStack>
              <Button
                size="sm"
                colorScheme="green"
                variant="outline"
                onClick={() => setShowRecipientSelector(!showRecipientSelector)}
              >
                {showRecipientSelector ? 'Hide' : 'Show'} Recipients
              </Button>
            </HStack>

            {showRecipientSelector && (
              <VStack align="stretch" gap={3} w="full">
                {/* Recipient Selection Controls */}
                <HStack gap={3} justify="space-between">
                  <HStack gap={2}>
                    <Button size="sm" variant="outline" onClick={selectAllRecipients}>
                      <CheckSquare size={14} style={{ marginRight: '4px' }} />
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearAllRecipients}>
                      <Square size={14} style={{ marginRight: '4px' }} />
                      Clear All
                    </Button>
                  </HStack>
                  <Text fontSize="sm" color="green.600">
                    {selectedRecipients.size} of {recipients.length} selected
                  </Text>
                </HStack>

                {/* Recipients List */}
                <Box
                  maxH="300px"
                  overflowY="auto"
                  border="1px solid"
                  borderColor="green.200"
                  borderRadius="md"
                  p={2}
                >
                  <VStack align="stretch" gap={2}>
                    {recipients.map((recipient) => (
                      <HStack
                        key={recipient.user_id}
                        p={2}
                        borderRadius="md"
                        bg={selectedRecipients.has(recipient.user_id) ? 'green.100' : 'transparent'}
                        _hover={{ bg: selectedRecipients.has(recipient.user_id) ? 'green.100' : 'green.50' }}
                        cursor="pointer"
                        onClick={() => toggleRecipient(recipient.user_id)}
                      >
                        <Checkbox
                          isChecked={selectedRecipients.has(recipient.user_id)}
                          onChange={() => toggleRecipient(recipient.user_id)}
                          colorScheme="green"
                        />
                        <VStack align="start" gap={0} flex={1}>
                          <Text fontWeight="semibold" fontSize="sm">
                            {recipient.first_name} {recipient.last_name}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {recipient.email}
                          </Text>
                        </VStack>
                        <Badge size="sm" colorScheme="blue" fontSize="xs">
                          {recipient.language?.toUpperCase() || 'EN'}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </Box>

                {/* Custom Email Form */}
                {selectedRecipients.size > 0 && (
                  <VStack align="stretch" gap={3} pt={3} borderTop="1px solid" borderColor="green.200">
                    <Input
                      placeholder="Email Subject"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      size="sm"
                    />
                    <Textarea
                      placeholder="Email Content (HTML)"
                      value={customHtml}
                      onChange={(e) => setCustomHtml(e.target.value)}
                      rows={6}
                      size="sm"
                    />
                    <HStack gap={3}>
                      <Button
                        colorScheme="green"
                        size="sm"
                        onClick={sendCustomEmail}
                        loading={loading}
                        loadingText="Sending..."
                        disabled={!customSubject || !customHtml}
                      >
                        <Send size={14} style={{ marginRight: '6px' }} />
                        Send to {selectedRecipients.size} Recipients
                      </Button>
                    </HStack>
                  </VStack>
                )}
              </VStack>
            )}
          </VStack>
        </Box>

        {/* New Campaign Form */}
        {showNewCampaign && (
          <Box bg="gray.50" p={6} borderRadius="lg" border="1px solid" borderColor="gray.200">
            <VStack align="stretch" gap={4}>
              <HStack justify="space-between" align="center">
                <Text fontSize="xl" fontWeight="semibold">Create New Campaign</Text>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNewCampaign(false)}
                >
                  Cancel
                </Button>
              </HStack>

              <Input
                placeholder="Campaign Name"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
              />

              <Input
                placeholder="Email Subject"
                value={newCampaign.subject}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
              />

              <Textarea
                placeholder="Email Content (HTML)"
                value={newCampaign.content_html}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, content_html: e.target.value }))}
                rows={10}
              />

              <Textarea
                placeholder="Plain Text Version (Optional)"
                value={newCampaign.content_text}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, content_text: e.target.value }))}
                rows={5}
              />

              <HStack gap={3}>
                <Button
                  colorScheme="blue"
                  onClick={createCampaign}
                  loading={loading}
                  loadingText="Creating..."
                >
                  <Mail size={16} style={{ marginRight: '8px' }} />
                  Create Campaign
                </Button>
              </HStack>

              <Box bg="blue.50" p={3} borderRadius="md">
                <Text fontSize="sm" color="blue.800">
                  <strong>Personalization variables:</strong> Use {'{{firstName}}'}, {'{{lastName}}'}, {'{{fullName}}'}, {'{{email}}'}, {'{{language}}'}, {'{{unsubscribeUrl}}'} in your content.
                </Text>
              </Box>
            </VStack>
          </Box>
        )}

        {/* Campaigns List */}
        <VStack align="stretch" gap={4}>
          <Text fontSize="xl" fontWeight="semibold">Email Campaigns</Text>

          {campaigns.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Mail size={48} color="#cbd5e0" />
              <Text mt={4} color="gray.500">No campaigns yet</Text>
              <Button
                mt={4}
                colorScheme="blue"
                onClick={() => setShowNewCampaign(true)}
              >
                <Plus size={16} style={{ marginRight: '8px' }} />
                Create Your First Campaign
              </Button>
            </Box>
          ) : (
            campaigns.map((campaign) => (
              <Box
                key={campaign.id}
                bg="white"
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                shadow="sm"
              >
                <HStack justify="space-between" align="start">
                  <VStack align="start" gap={2} flex={1}>
                    <HStack gap={3}>
                      <Text fontWeight="semibold" fontSize="lg">{campaign.name}</Text>
                      <Badge colorScheme={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </HStack>

                    <Text color="gray.600">{campaign.subject}</Text>

                    <HStack gap={4} fontSize="sm" color="gray.500">
                      <Text>Created: {new Date(campaign.created_at).toLocaleDateString()}</Text>
                      {campaign.sent_at && (
                        <Text>Sent: {new Date(campaign.sent_at).toLocaleDateString()}</Text>
                      )}
                      {campaign.recipient_count > 0 && (
                        <Text>Recipients: {campaign.recipient_count}</Text>
                      )}
                    </HStack>
                  </VStack>

                  <HStack gap={2}>
                    {campaign.status === 'draft' && (
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={() => sendCampaign(campaign.id)}
                        disabled={loading}
                      >
                        <Send size={14} style={{ marginRight: '6px' }} />
                        Send
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <Eye size={14} style={{ marginRight: '6px' }} />
                      View
                    </Button>

                    {campaign.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="red"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 size={14} style={{ marginRight: '6px' }} />
                        Delete
                      </Button>
                    )}
                  </HStack>
                </HStack>
              </Box>
            ))
          )}
        </VStack>

        {/* Campaign Details Modal */}
        {selectedCampaign && (
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="rgba(0,0,0,0.5)"
            zIndex={1000}
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={4}
            onClick={() => setSelectedCampaign(null)}
          >
            <Box
              bg="white"
              p={6}
              borderRadius="lg"
              maxW="800px"
              w="full"
              maxH="80vh"
              overflow="auto"
              onClick={(e) => e.stopPropagation()}
            >
              <VStack align="stretch" gap={4}>
                <HStack justify="space-between" align="center">
                  <Text fontSize="xl" fontWeight="semibold">{selectedCampaign.name}</Text>
                  <Button variant="ghost" onClick={() => setSelectedCampaign(null)}>×</Button>
                </HStack>

                <Box>
                  <Text fontWeight="semibold" mb={2}>Subject:</Text>
                  <Text>{selectedCampaign.subject}</Text>
                </Box>

                <Box>
                  <Text fontWeight="semibold" mb={2}>Content:</Text>
                  <Box
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    p={3}
                    dangerouslySetInnerHTML={{ __html: selectedCampaign.content_html }}
                  />
                </Box>

                {selectedCampaign.content_text && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Plain Text:</Text>
                    <Box
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      p={3}
                      fontFamily="mono"
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                    >
                      {selectedCampaign.content_text}
                    </Box>
                  </Box>
                )}
              </VStack>
            </Box>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default MarketingEmailAdmin;
