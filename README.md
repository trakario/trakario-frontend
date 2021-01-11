# Trakario

*An automatic job applicant tracking system*

Sometimes, for small job postings, we might want to make it easy on the applicants and just ask for them to email us their resume and/or GitHub. However, organizing all these emails quickly gets out of hand if more than just a few applicants apply.

Introducing Trakario, an automatic email-integrated applicant tracking system. Trakario hooks into your email to automatatically parse applicant emails, providing an organized, comprehensive view of each applicant.

![trakario-screenshot](https://user-images.githubusercontent.com/5875019/104210529-9c0ca000-53f8-11eb-9ad8-c2ee0b5c5a72.png)

## Setup

You will need to setup two components:
 - `trakario-frontend` (this repo; instructions below)
 - [`trakario-backend`](https://github.com/trakario-backend)

### Frontend Setup

This is a standard single-page React app which can be installed using [yarn](https://classic.yarnpkg.com/en/docs/install/) and setting up your `.env`:

```bash
yarn
cp .env.example .env
```

You will see you can configure your backend url within `.env`.

## Running

To launch the frontend, use `yarn start`:

```bash
yarn start
```

Note: The first time you open the frontend in the browser you will need to enter the `authToken` from the `.env` file of the **backend**.

## Deploying

Deploy as usual using `yarn build` to generate static files.

## Disclaimer

This project makes a number of assumptions about everything from types of applicant names to the attachements they provide. So it is very possible that given some new input it might break. Make sure to keep a record of original applicant emails to prevent accidental data loss.
