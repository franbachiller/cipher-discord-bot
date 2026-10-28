import { Command, CommandContext, CommandResult } from './types';
import { CommandManager } from './CommandManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para mostrar ayuda
 */
export function helpCommand(
  commandManager: CommandManager,
  logger: Logger
): Command {
  return {
    name: 'help',
    description: 'Muestra la lista de comandos disponibles o ayuda detallada de un comando específico',
    usage: '!help [comando]',
    category: 'Ayuda',
    requiredPermissions: [],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args } = context;

      // Si se especifica un comando, mostrar ayuda detallada
      const commandName = args[0];
      const helpMessage = commandManager.getHelp(commandName);

      return {
        success: true,
        message: helpMessage,
        data: {
          commandName: commandName || 'all'
        }
      };
    }
  };
}
