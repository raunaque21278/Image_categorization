// const axios = require("axios");
// const fs = require("fs");

// const generateCaption = async (
//   imagePath
// ) => {
//   try {
//     const imageBuffer =
//       fs.readFileSync(imagePath);

//     const response =
//       await axios.post(
//         "https://router.huggingface.co/hf-inference/models/nlpconnect/vit-gpt2-image-captioning",

//         imageBuffer,

//         {
//           headers: {
//             Authorization:
//               `Bearer ${process.env.HF_API_KEY}`,

//             "Content-Type":
//               "image/jpeg"
//           }
//         }
//       );

//     console.log(
//       "Caption Response:",
//       response.data
//     );

//     return (
//       response.data[0]
//         ?.generated_text ||
//       "No caption generated"
//     );

//   } catch (error) {

//   console.log(
//     "STATUS:",
//     error.response?.status
//   );

//   console.log(
//     "DATA:",
//     error.response?.data
//   );

//   return "Caption generation failed";
//   }}

// module.exports =
//   generateCaption;




const fs = require("fs");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
const prompt = `
Describe this image in one short sentence.
Maximum 20 words.
Do not explain details.
`;

const generateCaption = async (
  imagePath
) => {
  try {

    const imageBuffer =
      fs.readFileSync(imagePath);

    const base64Image =
      imageBuffer.toString("base64");

    const completion =
      await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",

        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Generate a short caption for this image."
              },
              {
                type: "image_url",
                image_url: {
                  url:
                    `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      });

    return completion.choices[0]
      .message.content;

  } catch (error) {

    console.error(
      "Caption Error:",
      error.message
    );

    return "Caption generation failed";
  }
};

module.exports =
  generateCaption;