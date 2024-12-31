import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// data.forEach(async (variant) => {
//   let variantCheck;
//   try {
//     variantCheck = await prisma.variant.findUnique({
//       where: { s_no: variant.s_no },
//     });
//   } catch (err) {
//     console.log(variant.s_no + " exists updateing");
//   }

//   if (!variantCheck) {
//     await prisma.variant.create({
//       data: {
//         s_no: variant.s_no,
//         breadth: variant.breadth,
//         length: variant.length,
//         thickness: isNaN(parseFloat(`${variant.thickness}`))
//           ? null
//           : parseFloat(`${variant.thickness}`),
//         leg: isNaN(parseFloat(`${variant.leg}`))
//           ? null
//           : parseFloat(`${variant.leg}`),
//         print_series: variant.print_series,
//         name: variant.name,
//         range: JSON.stringify(variant.range),
//         series: variant.series,
//       },
//     });
//   } else if (variantCheck) {
//     await prisma.variant.update({
//       data: {
//         s_no: variant.s_no,
//         breadth: variant.breadth,
//         length: variant.length,
//         thickness: isNaN(parseFloat(`${variant.thickness}`))
//           ? null
//           : parseFloat(`${variant.thickness}`),
//         leg: isNaN(parseFloat(`${variant.leg}`))
//           ? null
//           : parseFloat(`${variant.leg}`),
//         print_series: variant.print_series,
//         name: variant.name,
//         range: JSON.stringify(variant.range),
//         series: variant.series,
//       },
//       where: {
//         s_no: variant.s_no,
//       },
//     });
//   }
// });

export { prisma };
