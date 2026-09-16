// Switches between the text-input step and the review step of the AI capture
// flow, based on captureSlice's step machine — mounted once inside a Modal.

import React from 'react';
import { useAppSelector } from '../../../core/hooks';
import TextCaptureScreen from './TextCaptureScreen';
import ReviewProposalScreen from './ReviewProposalScreen';

interface AiCaptureFlowProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AiCaptureFlow({ onClose, onSuccess }: AiCaptureFlowProps) {
  const step = useAppSelector((state) => state.capture.step);

  if (step === 'review' || step === 'confirming') {
    return <ReviewProposalScreen onClose={onClose} onSuccess={onSuccess} />;
  }

  return <TextCaptureScreen onClose={onClose} />;
}
