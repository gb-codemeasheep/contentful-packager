### Contentful Packager

**This is an in-progress document**

The application takes command from the CLI and supports 4 different sub commands:

First of all 3 commands having specific effects

    packager sync <space-alias> : pulls new content from Contentful
    packager create <space-alias> : creates a tgz file from the downloaded data
    packager deploy <space-alias> : upload the archive to S3

And a command that executes all 3 in succession

    packager pack <space-alias>

Which will execute the following steps:

1. Download the full entries list as a JSON object (.json text file) to `.tmp/`
2. Download every asset (image or video) in the content tree and write it to `.tmp/`
3. Compress the entire `.tmp/` directory into `<space>.tgz`
4. Publish the newly packed `<space.tgz` file to S3

## Configuration requirements

The application requires two configuration files to be present and populated to work properly.

### .env

A plain text .env file must exist and define the following environment variables:

  * `AWS_ACCESS_KEY_ID`
  * `AWS_SECRET_ACCESS_KEY`
  * `AWS_S3_BUCKET_NAME`

This file follows the linux environment file format:

    AWS_ACCESS_KEY_ID=fsadjkljfskdlfjdslalfj
    AWS_SECRET_ACCESS_KEY=fjdlkjeiifjdlsajfeliwjfjdslajifesjaiesajf
    AWS_S3_BUCKET_NAME=contentful-packager

### spaces.json

This file is a JSON file listing all available spaces for the application to operate upon.
Each space must have a unique label (think of it as a key really) and provide its Contentful space id and access token.

The file is expected to have the following structure:

    {
      "spaces": [
        <space-definition>,
        <space-definition>,
        ...
      ]
    }

A space definition object is a simple object with 3 mandatory keys:

    {
      "label": "<space-handle>",
      "id": "<contentful-space-id>",
      "token": "<contentful-space-production-token>"
    }

For example as follows:


    {
      "label": "pumpkin-soup",
      "id": "jjfe0z9e0jfz9",
      "token": "fdsafjel9if93jffj3jfjfwljfa3l94fj39"
    }

##### Note:
Entire asset list may not be needed in the future if delta updates are planned and developed for.


#### Amazon S3 Directory Structure
Naming convention:

    <space-label>/<space-label>.<checksum>.tgz

For example

    pumpkin-soup/pumpkin-soup.mmddyyyy.92874sddfshkj3243ji234.tgz
    # other version of the file
    pumpkin-soup/pumpkin-soup.07162016.92874sddfshkj3243ji234.tgz
