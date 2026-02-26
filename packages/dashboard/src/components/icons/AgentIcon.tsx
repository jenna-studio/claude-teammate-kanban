/**
 * AgentIcon Component
 * Renders the appropriate AI provider icon based on agent name
 */
import React from 'react';
import { ClaudeIcon } from './ClaudeIcon';
import { GeminiIcon } from './GeminiIcon';
import { ChatGPTIcon } from './ChatGPTIcon';

interface AgentIconProps {
  agentName: string;
  className?: string;
  size?: number;
  color?: string;
}

function getIconForAgent(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('gemini')) return GeminiIcon;
  if (lower.includes('chatgpt') || lower.includes('codex') || lower.includes('gpt') || lower.includes('openai')) return ChatGPTIcon;
  return ClaudeIcon;
}

export const AgentIcon: React.FC<AgentIconProps> = ({
  agentName,
  className,
  size = 20,
  color = 'currentColor',
}) => {
  const Icon = getIconForAgent(agentName);
  const adjustedSize = Icon === ChatGPTIcon ? Math.round(size * 1.35) : size;
  return <Icon className={className} size={adjustedSize} color={color} />;
};

AgentIcon.displayName = 'AgentIcon';
