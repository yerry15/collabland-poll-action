import {getFetch, handleFetchResponse, stringify} from '@collabland/common';

type Option = {
  data: null | string;
  text: string;
  votes_count: number;
  poll_id: string;
  created_at: string;
  updated_at: string;
  id: string;
  entity: "Option";
};

type Poll = {
  data: null | string;
  identifier: null;
  question: string;
  created_at: string;
  updated_at: string;
  id: string;
  entity: "Poll";
  options: Option[];
};

type ApiResponse = {
  status: "success";
  statusCode: number;
  data: Poll;
};


export class Pollsapi {
  private fetch = getFetch({
    headers: {'api-key': 'F8CMMVTGA0MVPVHGFCA2M4HDJNA2'},
  });

  async createPoll(question: string, options: string[]) {
    const response = await this.fetch(
      'https://api.pollsapi.com/v1/create/poll',
      {
        method: 'post',
        body: JSON.stringify({
          question,
          options: options.map(opt => {
            return {text: opt};
          }),
        }),
      },
    );
    const data = await handleFetchResponse<ApiResponse>(response);
    return data;
  }

  async getPoll(id: string) {
    const response = await this.fetch(
      `https://api.pollsapi.com/v1/get/poll/${id}`,
      {
        method: 'get',
      },
    );
    const data = await handleFetchResponse(response);
    return data;
  }
}

async function main() {
  const api = new Pollsapi();
  const poll = await api.createPoll('What is your favorite color?', [
    'Red',
    'Blue',
    'Green',
  ]);
  console.log(stringify(poll));
  const pollId = poll.data.id;
  const found = await api.getPoll(pollId);
  console.log(found);
}

if (require.main === module) {
  main();
}
