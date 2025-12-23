"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type TutorialStep =
    | 'NONE'
    | 'WELCOME'
    | 'GO_TO_GUILD'
    | 'CREATE_TASK'
    | 'VOTE'
    | 'BID'
    | 'REVIEW'
    | 'AWAKENING'
    | 'COMPLETED';

interface TutorialContextType {
    step: TutorialStep;
    isActive: boolean;
    setStep: (step: TutorialStep) => void;
    nextStep: () => void;
    completeTutorial: () => void;
    startTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const STEPS: TutorialStep[] = [
    'WELCOME',
    'GO_TO_GUILD',
    'CREATE_TASK',
    'VOTE',
    'BID',
    'REVIEW',
    'AWAKENING',
    'COMPLETED'
];

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [step, setStepState] = useState<TutorialStep>('NONE');

    useEffect(() => {
        const saved = localStorage.getItem('tutorial_step') as TutorialStep;
        if (saved && STEPS.includes(saved)) {
            setStepState(saved);
        }
    }, []);

    const setStep = (newStep: TutorialStep) => {
        setStepState(newStep);
        if (newStep === 'NONE' || newStep === 'COMPLETED') {
            localStorage.removeItem('tutorial_step');
        } else {
            localStorage.setItem('tutorial_step', newStep);
        }
    };

    const nextStep = () => {
        const currentIndex = STEPS.indexOf(step);
        if (currentIndex !== -1 && currentIndex < STEPS.length - 1) {
            setStep(STEPS[currentIndex + 1]);
        }
    };

    const completeTutorial = () => {
        setStep('COMPLETED');
    };

    const startTutorial = () => {
        setStep('WELCOME');
    };

    return (
        <TutorialContext.Provider value={{
            step,
            isActive: step !== 'NONE' && step !== 'COMPLETED',
            setStep,
            nextStep,
            completeTutorial,
            startTutorial
        }}>
            {children}
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
}
