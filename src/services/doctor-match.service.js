import natural from "natural";
import Doctor from "../models/doctor.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import DoctorMatch from "../models/doctor-match.model.js";

const TfIdf = natural.TfIdf;
const BATCH_SIZE = 1000;

const preprocessText = (text) => {
  const tokenizer = new natural.AggressiveTokenizerVi();
  return tokenizer.tokenize(text.toLowerCase()).join(" ");
};

const calculateScore = (tfidfScore, experience) => {
  const expWeight = Math.min(experience / 10, 1);
  return tfidfScore * 0.7 + expWeight * 0.3;
};

const batchInsert = async (matches) => {
  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE);
    await DoctorMatch.insertMany(batch, { ordered: false });
  }
};

export const runDoctorProductMatching = async () => {
  console.log("Bắt đầu quá trình matching...");

  try {
    const [doctors, categories, products] = await Promise.all([
      Doctor.find({ isActive: true })
        .select("name specialty about experience")
        .lean(),
      Category.find().select("name description").lean(),
      Product.find({ enable: true })
        .select("name description categories")
        .populate("categories")
        .lean(),
    ]);

    console.log(
      `Tìm thấy: ${doctors.length} bác sĩ, ${categories.length} danh mục, ${products.length} sản phẩm`
    );

    const tfidf = new TfIdf();

    doctors.forEach((doctor) => {
      const doctorText = preprocessText(
        `${doctor.name} ${doctor.specialty} ${doctor.about} ${doctor.experience} năm kinh nghiệm`
      );
      tfidf.addDocument(doctorText);
    });

    const categoryMatches = new Map();

    for (const product of products) {
      const productCategories = product.categories
        .map((cat) => `${cat.name} ${cat.description}`)
        .join(" ");

      const productText = preprocessText(
        `${product.name} ${product.description} ${productCategories}`
      );

      doctors.forEach((doctor, doctorIndex) => {
        let score = 0;
        tfidf.tfidfs(productText, (i, measure) => {
          if (i === doctorIndex) score = measure;
        });

        const finalScore = calculateScore(score, doctor.experience);
        if (finalScore <= 0) return;

        product.categories.forEach((category) => {
          const key = `${doctor._id}-${category._id}`;

          if (!categoryMatches.has(key)) {
            categoryMatches.set(key, {
              doctor: doctor._id,
              category: category._id,
              score: 0,
              productCount: 0,
              products: [],
            });
          }

          const match = categoryMatches.get(key);
          match.score += finalScore;
          match.productCount++;
          match.products.push({
            product: product._id,
            score: finalScore,
          });
        });
      });
    }

    const finalMatches = Array.from(categoryMatches.values())
      .map((match) => ({
        ...match,
        score: match.score / match.productCount,
      }))
      .filter((match) => match.score > 0);

    console.log(`Tạo được ${finalMatches.length} matches`);

    await DoctorMatch.collection.drop().catch(() => {});
    await batchInsert(finalMatches);

    console.log("Hoàn thành quá trình matching");
    return finalMatches.length;
  } catch (error) {
    console.error("Lỗi trong quá trình matching:", error);
    throw error;
  }
};

export const getRecommendedDoctors = async (categoryId, limit = 5) => {
  const matches = await DoctorMatch.find({ category: categoryId })
    .sort({ score: -1 })
    .limit(limit)
    .populate("doctor", "name specialty experience about avatar")
    .populate({
      path: "products.product",
      select: "name description mainImage",
    })
    .lean();

  return matches.map((match) => ({
    doctor: match.doctor,
    matchScore: Math.round(match.score * 100) / 100,
    matchedProducts: match.products.slice(0, 3),
  }));
};
