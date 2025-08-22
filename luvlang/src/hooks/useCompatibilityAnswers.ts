
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { compatibilityQuestions } from '@/data/compatibilityQuestions';

export const useCompatibilityAnswers = () => {
  const { user } = useAuth();
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);

  const loadCompatibilityAnswers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('compatibility_answers')
        .select('answers')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading compatibility answers:', error);
        return;
      }

      if (data && data.answers) {
        setQuestionAnswers(data.answers as Record<number, string>);
      }
    } catch (error) {
      console.error('Error loading compatibility answers:', error);
    }
  };

  const saveCompatibilityAnswers = async () => {
    if (!user || Object.keys(questionAnswers).length === 0) return;

    setIsSavingAnswers(true);
    try {
      const answersPayload = {
        user_id: user.id,
        answers: questionAnswers,
        completed_at: new Date().toISOString()
      };

      // Check if compatibility answers already exist
      const { data: existingAnswers } = await supabase
        .from('compatibility_answers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let result;
      if (existingAnswers) {
        result = await supabase
          .from('compatibility_answers')
          .update(answersPayload)
          .eq('user_id', user.id);
      } else {
        result = await supabase
          .from('compatibility_answers')
          .insert([answersPayload]);
      }

      if (result.error) {
        console.error('Error saving compatibility answers:', result.error);
        toast({
          title: 'Error Saving Answers',
          description: result.error.message,
          variant: 'destructive'
        });
      } else {
        const answeredCount = Object.keys(questionAnswers).length;
        const totalQuestions = 17; // Updated to 17 questions
        const score = Math.round((answeredCount / totalQuestions) * 100);
        
        toast({
          title: 'Compatibility Answers Saved',
          description: `Your compatibility score: ${score}%. Answers saved successfully!`,
        });
      }
    } catch (error) {
      console.error('Error saving compatibility answers:', error);
      toast({
        title: 'Error Saving Answers',
        description: 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingAnswers(false);
    }
  };

  const handleQuestionAnswer = (questionId: number, answer: string) => {
    setQuestionAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  return {
    questionAnswers,
    isSavingAnswers,
    loadCompatibilityAnswers,
    saveCompatibilityAnswers,
    handleQuestionAnswer
  };
};
