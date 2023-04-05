// Copyright Abridged, Inc. 2023. All Rights Reserved.
// Node module: @collabland/example-poll-action
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { HttpErrors } from '@collabland/common';
import {
  APIInteractionResponse,
  ApplicationCommandSpec,
  ApplicationCommandType,
  BaseDiscordActionController,
  DiscordActionMetadata,
  DiscordActionRequest,
  DiscordActionResponse,
  DiscordInteractionPattern,
  InteractionResponseType,
  InteractionType
} from '@collabland/discord';
import { MiniAppManifest } from '@collabland/models';
import { BindingScope, injectable } from '@loopback/core';
import { api, get, param } from '@loopback/rest';
import {
  ActionRowBuilder, APIInteraction, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, MessageActionRowComponentBuilder, ModalActionRowComponentBuilder,
  ModalBuilder, TextInputBuilder,
  TextInputStyle
} from 'discord.js';

/**
 * CollabActionController is a LoopBack REST API controller that exposes endpoints
 * to support Collab.Land actions for Discord interactions.
 */
@injectable({
  scope: BindingScope.SINGLETON,
})
@api({ basePath: '/poll-action' }) // Set the base path to `/poll-action`
export class PollActionController extends BaseDiscordActionController {
  private interactions: {
    request: DiscordActionRequest<APIInteraction>;
    response: APIInteractionResponse;
    timestamp: number;
  }[] = [];

  @get('/interactions/{id}')
  async getInteraction(@param.path.string('id') interactionId: string) {
    const interactions = [];
    let interaction = undefined;
    for (const i of this.interactions) {
      if (i.request.id === interactionId) {
        interaction = i;
      }
      if (i.timestamp + 900 * 1000 <= Date.now()) {
        interactions.push(i);
      }
    }
    this.interactions = interactions;
    if (interaction == null) {
      throw new HttpErrors.NotFound(
        `Interaction ${interactionId} does not exist`,
      );
    }
    return interaction;
  }

  /**
   * Expose metadata for the action
   * @returns
   */
  async getMetadata(): Promise<DiscordActionMetadata> {
    const metadata: DiscordActionMetadata = {
      /**
       * Miniapp manifest
       */
      manifest: new MiniAppManifest({
        appId: 'poll-action',
        developer: 'collab.land',
        name: 'PollAction',
        platforms: ['discord'],
        shortName: 'poll-action',
        version: { name: '0.0.1' },
        website: 'https://collab.land',
        description:
          'An example Collab action to illustrate various Discord UI elements',
      }),
      /**
       * Supported Discord interactions. They allow Collab.Land to route Discord
       * interactions based on the type and name/custom-id.
       */
      supportedInteractions: this.getSupportedInteractions(),
      /**
       * Supported Discord application commands. They will be registered to a
       * Discord guild upon installation.
       */
      applicationCommands: this.getApplicationCommands(),
    };
    return metadata;
  }

  /**
   * Handle the Discord interaction
   * @param interaction - Discord interaction with Collab.Land action context
   * @returns - Discord interaction response
   */
  protected async handle(
    interaction: DiscordActionRequest<APIInteraction>,
  ): Promise<DiscordActionResponse | undefined> {
    if (
      interaction.type === InteractionType.ApplicationCommand &&
      interaction.data.name === 'poll'
    ) {
      const data = new ModalBuilder()
        .setTitle('Example modal')
        .setCustomId('poll:modal:modal')
        .addComponents(
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('poll:text:description')
              .setLabel('Poll Description')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Hello')
          ),
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('poll:text:options')
              .setLabel('Options for the poll')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('World')
          ),
        )
        .toJSON();
      return {
        type: InteractionResponseType.Modal,
        data,
      };
    }
    if (interaction.type === InteractionType.ModalSubmit) {
      const description = interaction.data.components[0].components[0].value
      const options = interaction.data.components[1].components[0].value.trim()
      const choices = options.split('\n')
      console.log(choices)
      const buttons = choices.map((c, index) => {
        return new ButtonBuilder()
          .setLabel(c)
          .setCustomId(`poll:button:${index}`)
          .setStyle(ButtonStyle.Success)
      })
      return {
        type: InteractionResponseType.ChannelMessageWithSource, data: {
          embeds: [new EmbedBuilder().setTitle(description).setDescription(options).toJSON()],
          components: [
            new ActionRowBuilder<MessageActionRowComponentBuilder>()
              .addComponents(
                buttons
              )
              .toJSON(),]
        }
      }
    }
    if (interaction.type === InteractionType.MessageComponent) {
      if (interaction.data.component_type === ComponentType.Button) {
        const customId = interaction.data.custom_id
        const index = customId.split(':')[2]
        //const label = choices[index]
        return { type: InteractionResponseType.ChannelMessageWithSource, data: { content: index } }
      }

    }
  }

  /**
   * Build a list of supported Discord interactions
   * @returns
   */
  private getSupportedInteractions(): DiscordInteractionPattern[] {
    return [
      {
        // Handle slash command
        type: InteractionType.ApplicationCommand,
        names: ['poll*'],
      },
      {
        // Handle slash command with auto complete
        type: InteractionType.ApplicationCommandAutocomplete,
        names: ['poll*'],
      },
      {
        // Handle buttons/selections
        type: InteractionType.MessageComponent,
        ids: ['poll:*'],
      },
      {
        // Handle modal
        type: InteractionType.ModalSubmit,
        ids: ['poll:*'],
      },
    ];
  }

  /**
   * Build a list of Discord application commands. It's possible to use tools
   * like https://autocode.com/tools/discord/command-builder/.
   * @returns
   */
  private getApplicationCommands(): ApplicationCommandSpec[] {
    const commands: ApplicationCommandSpec[] = [
      // `/poll-action` slash command
      {
        metadata: {
          name: 'PollAction',
          shortName: 'poll-action',
          supportedEnvs: ['poll', 'qa', 'staging'],
        },
        type: ApplicationCommandType.ChatInput,
        name: 'poll',
        description: 'Poll command',
      },
    ];
    return commands;
  }
}