<div align="center">

  <h1>nlp</h1>

  <p>
    Natural Language Processing (NLP) resources
  </p>

<!-- Badges -->
<p>
  <a href="https://github.com/v-bible/nlp/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/v-bible/nlp" alt="contributors" />
  </a>
  <a href="">
    <img src="https://img.shields.io/github/last-commit/v-bible/nlp" alt="last update" />
  </a>
  <a href="https://github.com/v-bible/nlp/network/members">
    <img src="https://img.shields.io/github/forks/v-bible/nlp" alt="forks" />
  </a>
  <a href="https://github.com/v-bible/nlp/stargazers">
    <img src="https://img.shields.io/github/stars/v-bible/nlp" alt="stars" />
  </a>
  <a href="https://github.com/v-bible/nlp/issues/">
    <img src="https://img.shields.io/github/issues/v-bible/nlp" alt="open issues" />
  </a>
  <a href="https://github.com/v-bible/nlp/blob/main/LICENSE.md">
    <img src="https://img.shields.io/github/license/v-bible/nlp.svg" alt="license" />
  </a>
</p>

<h4>
    <a href="https://github.com/v-bible/nlp/">View Demo</a>
  <span> · </span>
    <a href="https://github.com/v-bible/nlp">Documentation</a>
  <span> · </span>
    <a href="https://github.com/v-bible/nlp/issues/">Report Bug</a>
  <span> · </span>
    <a href="https://github.com/v-bible/nlp/issues/">Request Feature</a>
  </h4>
</div>

<br />

<!-- Table of Contents -->

# :notebook_with_decorative_cover: Table of Contents

- [About the Project](#star2-about-the-project)
  - [Environment Variables](#key-environment-variables)
- [Getting Started](#toolbox-getting-started)
  - [Prerequisites](#bangbang-prerequisites)
  - [Run Locally](#running-run-locally)
- [Usage](#eyes-usage)
  - [Category Guidelines](#category-guidelines)
    - [Category ID](#category-id)
    - [Folder Structure](#folder-structure)
    - [Category References](#category-references)
  - [Document Metadata](#document-metadata)
  - [Named Entity Recognition (NER)](#named-entity-recognition-ner)
    - [Entity Label Categories](#entity-label-categories)
    - [Setup Label Tools](#setup-label-tools)
    - [Getting API Token](#getting-api-token)
    - [Label Procedure](#label-procedure)
- [Contributing](#wave-contributing)
  - [Code of Conduct](#scroll-code-of-conduct)
- [License](#warning-license)
- [Contact](#handshake-contact)

<!-- About the Project -->

## :star2: About the Project

<!-- Env Variables -->

### :key: Environment Variables

To run this project, you will need to add the following environment variables to
your `.env` file:

- **App configs:**

  - `LOG_LEVEL`: Log level.

- **Label Studio configs:**

  - `LABEL_STUDIO_URL`: URL of the Label Studio instance. E.g.:
    `http://localhost:8080`.
  - `LABEL_STUDIO_LEGACY_TOKEN`: Legacy token for Label Studio API. You can
    generate it in the Label Studio settings page.
  - `LABEL_STUDIO_PROJECT_TITLE`: Title of the Label Studio project. This is used to
    import and export NER tasks, in `src/ner-processing/import-ner-task.ts` and
    `src/ner-processing/export-ner-task.ts` scripts.

> [!NOTE]
> These environments only required for `ner-processing` scripts to connect to
> Label Studio instance.

E.g:

```
# .env
LOG_LEVEL=info

LABEL_STUDIO_URL=http://localhost:8080
LABEL_STUDIO_LEGACY_TOKEN=eyJhb***
LABEL_STUDIO_PROJECT_TITLE=v-bible
```

You can also check out the file `.env.example` to see all required environment
variables.

<!-- Getting Started -->

## :toolbox: Getting Started

<!-- Prerequisites -->

### :bangbang: Prerequisites

- This project uses [pnpm](https://pnpm.io/) as package manager:

  ```bash
  npm install --global pnpm
  ```

- Playwright: Run the following command to download new browser binaries:

  ```bash
  npx playwright install
  ```

- `asdf` environment: Please setup `asdf` to install corresponding dependencies
  specified in `.tool-versions` file.

  - nodejs: `https://github.com/asdf-vm/asdf-nodejs.git`.

<!-- Run Locally -->

### :running: Run Locally

Clone the project:

```bash
git clone https://github.com/v-bible/nlp.git
```

Go to the project directory:

```bash
cd nlp
```

Install dependencies:

```bash
pnpm install
```

<!-- Usage -->

## :eyes: Usage

### Category Guidelines

#### Category ID

- **Sentence ID**: Each sentence ID **MUST** have the following format:

  ```
  <domain><subDomain><genre>_fff.ccc.ppp.ss
  ```

  - `domain`: Domain code. **Format**: 1 character, in uppercase. E.g: `R`.
  - `subDomain`: Subdomain code. **Format**: 1 character, in uppercase. E.g:
    `C`.
  - `genre`: Genre code. **Format**: 1 character, in uppercase. E.g: `D`.
  - `documentNumber` (`fff`): Document number of `genre`. **Format**: 3 digits,
    starting from `001`.
  - `chapterNumber` (`ccc`): Chapter number of `documentNumber`. **Format**: 3
    digits, starting from `001`.
  - `pageNumber` (`ppp`):
    - For text based data it is the paragraph number of `chapterNumber`.
    - For OCR data it is the page number of `chapterNumber`.
    - **Format**: 3 digits, starting from `001`.
  - `sentenceNumber` (`ss`): Sentence number of `pageNumber`. **Format**: 2
    digits, starting from `01`.

- **File ID**: Each file ID **MUST** have the following format:

  ```
  <domain><subDomain><genre>_fff.ccc.xml
  ```

  - `domain`: domain code. **Format**: 1 character, in uppercase. E.g: `R`.
  - `subDomain`: subdomain code. **Format**: 1 character, in uppercase. E.g:
    `C`.
  - `genre`: genre code. **Format**: 1 character, in uppercase. E.g: `D`.
  - `documentNumber` (`fff`): document number of `genre`. **Format**: 3 digits,
    starting from `001`.
  - `chapterNumber` (`ccc`): chapter number of `documentNumber`. **Format**: 3
    digits, starting from `001`.

#### Folder Structure

> [!NOTE]
> Data is stored on Huggingface dataset:
> [catholic-resources](https://huggingface.co/datasets/v-bible/catholic-resources).

> [!NOTE]
> Data is stored as folder of `<genre>`s instead of
> `corpus/<domain>/<subDomain>/<genre>`, because this repository is only stored
> for the **Catholic resources** (`RC`).

```
catholic-resources
└── corpus
    └── <genre>
        └── <domain><subDomain><genre>_fff (<documentTitle>)
            ├── <domain><subDomain><genre>_fff.ccc.xml
            ├── <domain><subDomain><genre>_fff.ccc.json
            ├── <domain><subDomain><genre>_fff.ccc.md
            └── ...
```

- `documentTitle`: The title of the document, which is used to identify the
  document.

#### Category References

> [!NOTE]
> Any changes to the category references should be reflected in the
> [`src/lib/nlp/mapping.ts`](./src/lib/nlp/mapping.ts) file.

- Domains:

| code | category | vietnamese |
| :--: | :------: | :--------: |
|  R   | religion |  Tôn giáo  |

- Subdomains:

| code | category | vietnamese |
| :--: | :------: | :--------: |
|  C   | catholic | Công Giáo  |

- Genres:

> [!NOTE]
> Genres with no category are **reserved** for future use.

| code |           category            |        vietnamese        |
| :--: | :---------------------------: | :----------------------: |
|  A   |     advent contemplation      |    Suy niệm Mùa Vọng     |
|  B   |                               |                          |
|  C   |          catechesis           |    Giáo lý/Giáo huấn     |
|  D   |        church document        |    Văn kiện Giáo Hội     |
|  E   |      exegesis/commentary      |    Chú giải/Bình luận    |
|  F   |      lent contemplation       |    Suy niệm Mùa Chay     |
|  G   |     easter contemplation      |  Suy niệm Mùa Phục Sinh  |
|  H   |       ot contemplation        | Suy niệm Mùa Thường Niên |
|  I   |      other contemplation      |      Suy niệm khác       |
|  J   |                               |                          |
|  K   |                               |                          |
|  L   |          liturgical           |         Phụng vụ         |
|  M   |            memoir             |          Hồi ký          |
|  N   |         new testament         |    Kinh Thánh Tân Ước    |
|  O   |         old testament         |    Kinh Thánh Cựu Ước    |
|  P   |            prayer             |        Cầu nguyện        |
|  Q   |                               |                          |
|  R   |                               |                          |
|  S   | saint/beatification biography | Tiểu sử Thánh/Chân phước |
|  T   |           theology            |         Thần học         |
|  U   |                               |                          |
|  V   |                               |                          |
|  W   |                               |                          |
|  X   |    christmas contemplation    | Suy niệm Mùa Giáng Sinh  |
|  Y   |          philosophy           |        Triết học         |
|  Z   |            others             |           Khác           |

- Tags:

> [!NOTE]
> Tags are used to further classify the genres. Currently, they are not used to
> construct the sentence ID. However, this information is stored in the metadata
> of the sentence.

<details>
<summary>Tag references</summary>

| code |                                        category                                         |                                 vietnamese                                  |
| :--: | :-------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------: |
|      |                                 apostolic constitution                                  |                        Tông hiến (Văn kiện Giáo Hội)                        |
|      |                                    encyclical letter                                    |                       Thông điệp (Văn kiện Giáo Hội)                        |
|      |                                    apostolic letter                                     |                        Tông thư (Văn kiện Giáo Hội)                         |
|      |                                      declarations                                       |                       Tuyên ngôn (Văn kiện Giáo Hội)                        |
|      |                                      motu proprio                                       |                Tài liệu dưới dạng tự sắc (Văn kiện Giáo Hội)                |
|      |                                 apostolic exhortations                                  |                        Tông huấn (Văn kiện Giáo Hội)                        |
|      |                                      note document                                      |                         Ghi chú (Văn kiện Giáo Hội)                         |
|      |                                  urbi et orbi message                                   |              Sứ điệp Giáng Sinh/Phục Sinh (Văn kiện Giáo Hội)               |
|      |                                      constitution                                       |                        Hiến chế (Văn kiện Giáo Hội)                         |
|      |                                         decrees                                         |                        Sắc lệnh (Văn kiện Giáo Hội)                         |
|      |                                  instrumentum laboris                                   |                    Tài liệu làm việc (Văn kiện Giáo Hội)                    |
|      |                                  synod of bishops note                                  |          Ghi chú của Thượng Hội đồng Giám mục (Văn kiện Giáo Hội)           |
|      |                                         letters                                         |                           Thư (Văn kiện Giáo Hội)                           |
|      |                                        messages                                         |                         Sứ điệp (Văn kiện Giáo Hội)                         |
|      |                                bible pentateuch division                                |                        Ngũ Thư (Kinh Thánh Cựu Ước)                         |
|      |                             bible historical books division                             |                        Lịch Sử (Kinh Thánh Cựu Ước)                         |
|      |                           bible poetic/wisdom books division                            |                 Giáo huấn - Khôn ngoan (Kinh Thánh Cựu Ước)                 |
|      |                             bible prophetic books division                              |                   Ngôn sứ - Tiên tri (Kinh Thánh Cựu Ước)                   |
|      |                                 bible gospels division                                  |                Sách Phúc Âm - Tin Mừng (Kinh Thánh Tân Ước)                 |
|      |                                   bible acts division                                   |                  Sách Công vụ Tông đồ (Kinh Thánh Tân Ước)                  |
|      |                             bible pauline letters division                              |            Các thư mục vụ của Thánh Phao-lô (Kinh Thánh Tân Ước)            |
|      |                             bible general epistles division                             |                     Các thư chung (Kinh Thánh Tân Ước)                      |
|      |                                bible revelation division                                |                    Sách Khải Huyền (Kinh Thánh Tân Ước)                     |
|      |                               morning and evening prayers                               |         Các kinh đọc sáng tối ngày thường và Chúa Nhật (Cầu nguyện)         |
|      | offertory prayer, prayers of preparation for holy communion and prayers of thanksgiving | Kinh dâng lễ, những kinh dọn mình chịu lễ và những kinh cám ơn (Cầu nguyện) |
|      |                            the stations of the cross prayers                            |         Kinh ngắm Đàng Thánh giá và ít nhiều kinh khác (Cầu nguyện)         |
|      |                                     rosary prayers                                      |                      Phép lần hạt Mân Côi (Cầu nguyện)                      |
|      |                                         prayers                                         |                            Kinh cầu (Cầu nguyện)                            |
|      |                                      daily prayers                                      |                       Kinh đọc hàng ngày (Cầu nguyện)                       |
|      |                                          maria                                          |                                  Mẹ Maria                                   |
|      |                                         advent                                          |                                  Mùa Vọng                                   |
|      |                                        christmas                                        |                               Mùa Giáng Sinh                                |
|      |                                          lent                                           |                                  Mùa Chay                                   |
|      |                                         triduum                                         |                            Mùa Chay - Tuần Thánh                            |
|      |                                         easter                                          |                                Mùa Phục Sinh                                |
|      |                                           ot                                            |                               Mùa Thường niên                               |
|      |                                      celebrations                                       |                                   Lễ lớn                                    |
|      |                                      jubilee year                                       |                                  Năm Thánh                                  |

</details>

### Document Metadata

Document Metadata is stored in the [data/main.tsv](./data/main.tsv), which is
downloaded from Google Sheets [\[NLP\] Danh sách tài liệu Công
giáo](https://docs.google.com/spreadsheets/d/1YETFmWnGOM1E2Z0pLMkxkqHczyzCmIbqptQ25VFuBGM/edit?usp=sharing)
and is updated periodically.

> [!IMPORTANT]
> Only export file to `TSV` format, do not export to `CSV` format.

### Named Entity Recognition (NER)

#### Entity Label Categories

> [!NOTE]
> Any changes to the category references should be reflected in the
> [`src/lib/ner/mapping.ts`](./src/lib/ner/mapping.ts) file.

| label |   category   |              examples              |          vietnamese examples           |
| :---: | :----------: | :--------------------------------: | :------------------------------------: |
|  PER  |    person    | Jesus, Mary, Peter, Paul, John,... | Giêsu, Maria, Phêrô, Phaolô, Gioan,... |
|  LOC  |   location   |   Jerusalem, Rome, Bethlehem,...   |      Giêrusalem, Rôma, Bêlem,...       |
|  ORG  | organization |    Vatican, Catholic Church,...    |    Vatican, Giáo Hội Công Giáo,...     |
| TITLE |    title     |     Pope, Bishop, Cardinal,...     |    Giáo hoàng, Giám mục, Hồng y,...    |
|  TME  |     time     |    Sunday, Monday, January,...     |  Chúa Nhật, Thứ Hai, Tháng Giêng,...   |
|  NUM  |    number    |         1, 2, 3, 4, 5,...          |           1, 2, 3, 4, 5,...            |

#### Setup Label Tools

Please use [Label Studio](https://labelstud.io/) to label the NER data. Please
refer to the
[v-bible/nlp-label-studio](https://github.com/v-bible/nlp-label-studio) for
setuping Label Studio.

#### Getting API Token

To get Label Studio Legacy API token, go to
`http://localhost:8080/organization` > `API Tokens Settings` > Check `Legacy
Tokens` > `Save`.

#### Label Procedure

> [!NOTE]
> Instead labeling all the sentences in the corpus at once, we should **chunk
> the corpus into genres**, and then label each genre separately. This will help
> to reduce the complexity of the labeling process and make it easier to manage.

The label procedure is as follows:

1.  Extract NER tasks:

    - Use script
      [`src/ner-processing/extract-ner-task.ts`](./src/ner-processing/extract-ner-task.ts) to
      extract NER tasks from the corpus data tree.

    - Read JSON corpus data tree from `dist/corpus` **by genre** and write output
      to `dist/task-data`.

    - The output structure:

      ```
      dist/task-data
      └── <genre>
          ├── <domain><subDomain><genre>_fff.ccc.json
          └── ...
      ```

    - The data is stored in JSON format, which is compatible with Label Studio.
      It may contains annotated data from previous labeling sessions, these will
      be imported as ground truth data.

    - Sample data:

      ```json
      [
        {
          "data": {
            "text": "Đây là gia phả Đức Giê-su Ki-tô, con cháu vua Đa-vít, con cháu tổ phụ Áp-ra-ham :",
            "documentId": "RCN_001",
            "chapterId": "RCN_001.001",
            "sentenceId": "RCN_001.001.001.01",
            "sentenceType": "single",
            "title": "Phúc Âm theo Thánh Mát-thêu",
            "genreCode": "N"
          },
          "annotations": [
            {
              "result": [
                {
                  "value": {
                    "start": 15,
                    "end": 31,
                    "text": "Đức Giê-su Ki-tô",
                    "labels": ["PER"]
                  },
                  "from_name": "label",
                  "to_name": "text",
                  "type": "labels"
                },
                {
                  "value": {
                    "start": 42,
                    "end": 52,
                    "text": "vua Đa-vít",
                    "labels": ["PER"]
                  },
                  "from_name": "label",
                  "to_name": "text",
                  "type": "labels"
                },
                {
                  "value": {
                    "start": 63,
                    "end": 79,
                    "text": "tổ phụ Áp-ra-ham",
                    "labels": ["PER"]
                  },
                  "from_name": "label",
                  "to_name": "text",
                  "type": "labels"
                }
              ]
            }
          ]
        }
      ]
      ```

> [!NOTE]
> If the task has not been labeled yet, don't add any annotations to the
> task data, else it will be considered as ground truth data.

2.  Import NER tasks to Label Studio:

    - Import the NER tasks by creating a new project and selecting the `dist/task-data`
      folder as the data source, or use script
      [`src/ner-processing/import-ner-task.ts`](./src/ner-processing/import-ner-task.ts)
      (**recommended**)
      to import NER tasks to Label Studio using Label Studio API.

3.  Label NER tasks:

    - Use Label Studio to label the NER tasks. The labeling interface is
      configured in the project settings, which is described in the
      [v-bible/nlp-label-studio](https://github.com/v-bible/nlp-label-studio)
      repository.

4.  Export NER labels:

    - Use script
      [`src/ner-processing/export-ner-task.ts`](./src/ner-processing/export-ner-task.ts)
      to export the NER tasks from Label Studio to `dist/task-data`.

5.  Inject annotations to data tree:

    - Use script
      [`src/ner-processing/inject-annotation.ts`](./src/ner-processing/inject-annotation.ts)
      to inject the annotations from `dist/task-data` to the corpus data tree in
      `dist/corpus`.

<!-- Contributing -->

## :wave: Contributing

<a href="https://github.com/v-bible/nlp/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=v-bible/nlp" />
</a>

Contributions are always welcome!

Please read the [contribution guidelines](./CONTRIBUTING.md).

<!-- Code of Conduct -->

### :scroll: Code of Conduct

Please read the [Code of Conduct](./CODE_OF_CONDUCT.md).

<!-- License -->

## :warning: License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** License.

[![License: CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

See the **[LICENSE.md](./LICENSE.md)** file for full details.

<!-- Contact -->

## :handshake: Contact

Duong Vinh - [@duckymomo20012](https://twitter.com/duckymomo20012) -
tienvinh.duong4@gmail.com

Project Link: [https://github.com/v-bible/nlp](https://github.com/v-bible/nlp).
