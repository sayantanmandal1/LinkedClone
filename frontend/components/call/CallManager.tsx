'use client';

import { useCall } from '@/contexts/CallContext';
import { useAuth } from '@/contexts/AuthContext';
import IncomingCallNotification from './IncomingCallNotification';
import CallingScreen from './CallingScreen';
import VoiceCallInterface from './VoiceCallInterface';
import VideoCallInterface from './VideoCallInterface';

export default function CallManager() {
  const { user: currentUser } = useAuth();
  const {
    callStatus,
    callType,
    caller,
    recipient,
    callDuration,
    isMuted,
    isVideoEnabled,
    localStream,
    remoteStream,
    connectionQuality,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCall();

  // Render incoming call notification when ringing
  if (callStatus === 'ringing' && caller) {
    return (
      <IncomingCallNotification
        caller={caller}
        callType={callType!}
        onAccept={acceptCall}
        onDecline={declineCall}
        onDismiss={declineCall}
      />
    );
  }

  // Render calling screen when initiating a call (waiting for recipient to answer)
  if (callStatus === 'calling' && recipient) {
    return (
      <CallingScreen
        recipient={recipient}
        callType={callType!}
        onCancel={endCall}
      />
    );
  }

  // Render voice call interface for voice calls (connected state only)
  if (callStatus === 'connected' && callType === 'voice') {
    // Determine the other participant
    // If we're the caller, show recipient; if we're the recipient, show caller
    let participant = null;
    
    if (currentUser) {
      if (caller && caller._id === currentUser._id) {
        // We are the caller, show recipient
        participant = recipient;
      } else if (caller) {
        // We are the recipient, show caller
        participant = caller;
      }
    }
    
    // If we still don't have participant info, try to use whichever is available
    if (!participant) {
      participant = recipient || caller;
    }
    
    if (participant) {
      return (
        <VoiceCallInterface
          participant={participant}
          duration={callDuration}
          isMuted={isMuted}
          connectionQuality={connectionQuality}
          onToggleMute={toggleMute}
          onEndCall={endCall}
        />
      );
    }
  }

  // Render video call interface for video calls (connected state only)
  if (callStatus === 'connected' && callType === 'video') {
    // Determine the other participant
    // If we're the caller, show recipient; if we're the recipient, show caller
    let participant = null;
    
    if (currentUser) {
      if (caller && caller._id === currentUser._id) {
        // We are the caller, show recipient
        participant = recipient;
      } else if (caller) {
        // We are the recipient, show caller
        participant = caller;
      }
    }
    
    // If we still don't have participant info, try to use whichever is available
    if (!participant) {
      participant = recipient || caller;
    }
    
    if (participant) {
      return (
        <VideoCallInterface
          participant={participant}
          duration={callDuration}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          connectionQuality={connectionQuality}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onEndCall={endCall}
        />
      );
    }
  }

  return null;
}
