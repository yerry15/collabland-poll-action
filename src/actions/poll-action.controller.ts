// Copyright Abridged, Inc. 2023. All Rights Reserved.
// Node module: @collabland/example-poll-action
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {HttpErrors, stringify} from '@collabland/common';
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
  InteractionType,
} from '@collabland/discord';
import {MiniAppManifest} from '@collabland/models';
import {BindingScope, injectable} from '@loopback/core';
import {api, get, param} from '@loopback/rest';
import {
  APIInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  MessageFlags,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';

/**
 * CollabActionController is a LoopBack REST API controller that exposes endpoints
 * to support Collab.Land actions for Discord interactions.
 */
@injectable({
  scope: BindingScope.SINGLETON,
})
@api({basePath: '/poll-action'}) // Set the base path to `/poll-action`
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
        version: {name: '0.0.1'},
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
  ): Promise<DiscordActionResponse> {
    if (
      interaction.type === InteractionType.MessageComponent &&
      interaction.data.custom_id === 'poll:button:modal'
    ) {
      const data = new ModalBuilder()
        .setTitle('Example modal')
        .setCustomId('poll:modal:modal')
        .addComponents(
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('poll:text:interaction')
              .setLabel('Interaction')
              .setStyle(TextInputStyle.Paragraph)
              .setValue(this.describeInteraction(interaction)),
          ),
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('poll:text:interaction-data')
              .setLabel('Interaction data')
              .setStyle(TextInputStyle.Paragraph)
              .setValue(this.renderInteractionData(interaction, false)),
          ),
        )
        .toJSON();
      return {
        type: InteractionResponseType.Modal,
        data,
      };
    }
    const response: APIInteractionResponse = {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        embeds: [
          new EmbedBuilder()
            .setTitle('embed: Interaction')
            .setDescription(this.describeInteraction(interaction))
            .toJSON(),
          new EmbedBuilder()
            .setTitle('embed: Request data')
            .setDescription(this.renderInteractionData(interaction))
            .toJSON(),
        ],
        components: [
          new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents([
              new ButtonBuilder()
                .setLabel('link: Request/response')
                .setURL(
                  `http://localhost:3000/poll-action/interactions/${interaction.id}`,
                )
                .setStyle(ButtonStyle.Link),
              new ButtonBuilder()
                .setLabel('button: Click me')
                .setCustomId('poll:button:click')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setLabel('button: Render a modal')
                .setCustomId('poll:button:modal')
                .setStyle(ButtonStyle.Primary),
            ])
            .toJSON(),

          new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('poll:select:string')
                .setPlaceholder('string-select-menu: Select a color')
                .addOptions(
                  new StringSelectMenuOptionBuilder()
                    .setLabel('Red')
                    .setValue('red'),
                  new StringSelectMenuOptionBuilder()
                    .setLabel('Green')
                    .setValue('green'),
                  new StringSelectMenuOptionBuilder()
                    .setLabel('Blue')
                    .setValue('blue'),
                ),
            )
            .toJSON(),

          new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new RoleSelectMenuBuilder()
                .setCustomId('poll:select:role')
                .setPlaceholder('role-select-menu: Select a role'),
            )
            .toJSON(),

          new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new UserSelectMenuBuilder()
                .setCustomId('poll:select:user')
                .setPlaceholder('user-select-menu: Select a user'),
              /*
              new ChannelSelectMenuBuilder()
                .setCustomId('poll:select:channel')
                .setPlaceholder('channel-select-menu: Select a channel'),
                */
            )
            .toJSON(),
        ],
      },
    };
    this.interactions.push({
      request: interaction,
      response,
      timestamp: Date.now(),
    });
    return response;
  }

  private renderInteractionData(
    interaction: DiscordActionRequest<APIInteraction>,
    md = true,
  ): string {
    const data = stringify(interaction.data);
    return md ? '```json\n' + data + '```' : data;
  }

  private describeInteraction(
    interaction: DiscordActionRequest<APIInteraction>,
  ): string {
    return `Interaction id: ${interaction.id}
Interaction type: ${interaction.type}            
Application id: ${interaction.application_id}
Guild id: ${interaction.guild_id}
Channel id: ${interaction.channel_id}
User id: ${interaction.member?.user.id}
User name: ${interaction.member?.user.username}#${interaction.member?.user.discriminator}            
`;
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
