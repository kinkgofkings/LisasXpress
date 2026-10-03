const mealNote = "Stir in the eggshell or this is not a meal. Rinse eggshells, dry them, and grind them to a powder. One level teaspoon is about 2,000 mg of calcium. Use 1/2 teaspoon of that powder for each pound of finished food. No onion, garlic, salt, grapes, raisins, xylitol, or chocolate. Cook the meat through. Refrigerate for 3 days or freeze daily portions. This is a home bowl. Ask the vet for the daily amount for that dog. A veterinary nutritionist can write a diet for one dog. BalanceIT is one place to start.";

const scoops = "A starting scoop, split into two meals: a 20-pound dog may begin near 1 to 1 1/2 cups a day, a 40-pound dog near 2 to 3 cups, and a 70-pound dog near 4 to 5 cups. Weigh the dog every week. Feed less if the weight climbs, and more if it falls.";

export const DOG_MEALS = [
  {
    id: "dog-eggshell",
    title: "Ground Eggshell for Dog Meals",
    cuisine: "pets",
    category: "Meals",
    summary: "The calcium that turns a pot of meat and vegetables into a meal. Make the powder once and use it in every bowl.",
    yieldText: "about 1 teaspoon per large egg",
    prepMinutes: 10,
    cookMinutes: 10,
    ingredients: [
      "Washed eggshells",
      "A clean coffee grinder or blender used only for this",
      "A small dry jar"
    ],
    steps: [
      "Rinse the shells. Pull off the inner membrane if it comes away easily.",
      "Dry them on a rack overnight, or bake them at 200°F for about 10 minutes until they are brittle. Do not brown them.",
      "Grind them to a fine powder. One large shell makes about one level teaspoon, and that teaspoon is about 2,000 mg of calcium.",
      "Keep the jar sealed and dry. Stir 1/2 teaspoon into each pound of finished dog food after the food has cooked."
    ],
    notes: "Bits of shell in the stool mean it was not ground fine enough. Do not use this powder in people food. The other dog meals in this book depend on it.",
    image: "",
    imageCredit: "",
    sourceUrl: "https://www.whole-dog-journal.com/food/calcium-in-homemade-dog-food/",
    sourceTitle: "Calcium in homemade dog food",
    youtube: "",
    family: true
  },
  {
    id: "chicken-rice-dog-meal",
    title: "Chicken and Rice Dog Meal",
    cuisine: "pets",
    category: "Meals",
    summary: "Cooked chicken thigh, a little liver, rice, carrot, and green beans, finished with ground eggshell.",
    yieldText: "about 4 pounds of finished food",
    prepMinutes: 25,
    cookMinutes: 40,
    ingredients: [
      "2 lb boneless chicken thigh",
      "1 1/2 oz chicken liver",
      "1 cup long-grain white rice",
      "2 cups water",
      "2 carrots, diced",
      "1 cup green beans, cut small",
      "Ground eggshell, 1/2 teaspoon per pound of finished food"
    ],
    steps: [
      "Cut the chicken and liver into small pieces. Simmer them in plain water until the chicken reaches 165°F. No salt, onion, or garlic.",
      "Cook the rice in the 2 cups of water until soft.",
      "Steam the carrots and green beans until a fork mashes them.",
      "Chop the meat fine. Mix meat, rice, and vegetables. Weigh the pot.",
      "Stir in 1/2 teaspoon of eggshell powder for every pound on that scale. Cool it.",
      scoops
    ],
    notes: mealNote,
    image: "",
    imageCredit: "",
    sourceUrl: "https://sites.tufts.edu/petfoodology/2016/07/14/should-you-make-your-own-pet-food-at-home/",
    sourceTitle: "Tufts: homemade pet food",
    youtube: "",
    family: true
  },
  {
    id: "beef-sweet-potato-dog-meal",
    title: "Beef and Sweet Potato Dog Meal",
    cuisine: "pets",
    category: "Meals",
    summary: "Lean beef, liver, sweet potato, and zucchini, with eggshell stirred in after it cooks.",
    yieldText: "about 4 pounds of finished food",
    prepMinutes: 25,
    cookMinutes: 45,
    ingredients: [
      "2 lb lean ground beef, or beef chuck trimmed of hard fat",
      "1 1/2 oz beef liver",
      "2 medium sweet potatoes, peeled and diced",
      "1 zucchini, diced",
      "1/2 cup water",
      "Ground eggshell, 1/2 teaspoon per pound of finished food"
    ],
    steps: [
      "Brown the beef and liver in a pot, breaking the meat up small. Drain the pooled fat.",
      "Add the sweet potato, zucchini, and water. Cover and simmer until the potato mashes, about 20 minutes.",
      "Stir so the liver is mixed through, not left in one clump. Weigh the finished food.",
      "Take the pot off the heat. Stir in 1/2 teaspoon of eggshell powder per pound.",
      "Cool, then pack daily portions.",
      scoops
    ],
    notes: mealNote,
    image: "",
    imageCredit: "",
    sourceUrl: "https://www.balanceit.com/",
    sourceTitle: "BalanceIT",
    youtube: "",
    family: true
  },
  {
    id: "turkey-pumpkin-dog-meal",
    title: "Turkey and Pumpkin Dog Meal",
    cuisine: "pets",
    category: "Meals",
    summary: "Ground turkey, liver, oats, and plain pumpkin. Use pumpkin puree, not pumpkin pie filling.",
    yieldText: "about 4 pounds of finished food",
    prepMinutes: 20,
    cookMinutes: 30,
    ingredients: [
      "2 lb ground turkey",
      "1 1/2 oz turkey or chicken liver",
      "1 cup rolled oats",
      "2 cups water",
      "1 cup plain pumpkin puree",
      "1 carrot, grated",
      "Ground eggshell, 1/2 teaspoon per pound of finished food"
    ],
    steps: [
      "Cook the turkey and liver in a pot until the turkey is no longer pink. Break it up fine.",
      "Stir in the oats, water, pumpkin, and carrot. Simmer about 10 minutes, until the oats are soft and the liquid is absorbed.",
      "Weigh the finished food. Off the heat, stir in 1/2 teaspoon of eggshell powder per pound.",
      "Cool and portion it.",
      scoops
    ],
    notes: mealNote + " Pie filling has sugar and spice. It does not belong in this pot.",
    image: "",
    imageCredit: "",
    sourceUrl: "https://www.balanceit.com/",
    sourceTitle: "BalanceIT",
    youtube: "",
    family: true
  },
  {
    id: "fish-potato-dog-meal",
    title: "Fish and Potato Dog Meal",
    cuisine: "pets",
    category: "Meals",
    summary: "Mild white fish, potato, and green beans, with a little liver and eggshell. Bones are picked out.",
    yieldText: "about 4 pounds of finished food",
    prepMinutes: 25,
    cookMinutes: 35,
    ingredients: [
      "2 lb boneless white fish, such as cod or pollock",
      "1 1/2 oz chicken liver",
      "3 potatoes, peeled and diced",
      "1 cup green beans, cut small",
      "1 cup water",
      "Ground eggshell, 1/2 teaspoon per pound of finished food"
    ],
    steps: [
      "Simmer the potatoes and green beans in the water until soft.",
      "Lay the fish and liver on top, cover, and cook until the fish flakes and the liver is done. Pick out every bone.",
      "Flake the fish and chop the liver. Mix them through the potatoes. Weigh the pot.",
      "Off the heat, stir in 1/2 teaspoon of eggshell powder per pound.",
      "Cool and freeze what will not be eaten in 3 days.",
      scoops
    ],
    notes: mealNote + " Two or three times a week, mash one unsalted sardine packed in water into a 40-pound dog's supper for the fish oil. Skip sardines packed in salt or sauce.",
    image: "",
    imageCredit: "",
    sourceUrl: "https://sites.tufts.edu/petfoodology/2019/10/16/reasons-to-avoid-a-home-cooked-diet/",
    sourceTitle: "Tufts: home-cooked diets",
    youtube: "",
    family: true
  },
  {
    id: "beef-heart-barley-dog-meal",
    title: "Beef Heart and Barley Dog Meal",
    cuisine: "pets",
    category: "Meals",
    summary: "Beef heart is muscle meat. This bowl still needs a little liver, barley, carrot, and eggshell.",
    yieldText: "about 4 pounds of finished food",
    prepMinutes: 25,
    cookMinutes: 50,
    ingredients: [
      "2 lb beef heart, trimmed of valves and hard fat, diced",
      "1 1/2 oz beef liver",
      "3/4 cup pearl barley",
      "3 cups water",
      "2 carrots, diced",
      "Ground eggshell, 1/2 teaspoon per pound of finished food"
    ],
    steps: [
      "Simmer the barley in the water until it is tender, about 35 minutes. Add water if it goes dry.",
      "Cook the heart and liver in a separate pot with a splash of water until the heart is no longer pink. Chop both fine.",
      "Steam or simmer the carrots until soft. Mix heart, liver, barley, and carrot. Weigh it.",
      "Stir in 1/2 teaspoon of eggshell powder per pound of that finished weight.",
      "Cool and portion.",
      scoops
    ],
    notes: mealNote + " Heart does not replace liver. Keep the liver in the pot.",
    image: "",
    imageCredit: "",
    sourceUrl: "https://www.balanceit.com/",
    sourceTitle: "BalanceIT",
    youtube: "",
    family: true
  },
  {
    id: "chicken-egg-dog-meal",
    title: "Chicken and Egg Dog Meal",
    cuisine: "pets",
    category: "Meals",
    summary: "Chicken, egg, rice, and pumpkin, plus the same liver and eggshell the other meals use.",
    yieldText: "about 4 pounds of finished food",
    prepMinutes: 20,
    cookMinutes: 35,
    ingredients: [
      "1 1/2 lb boneless chicken thigh",
      "1 1/2 oz chicken liver",
      "2 eggs",
      "1 cup white rice",
      "2 cups water",
      "1 cup plain pumpkin puree",
      "Ground eggshell, 1/2 teaspoon per pound of finished food"
    ],
    steps: [
      "Cook the rice in the water.",
      "Simmer the chicken and liver until the chicken reaches 165°F. Chop them fine.",
      "Scramble the eggs in a clean pan with no butter and no salt. Stir them into the meat.",
      "Mix in the rice and pumpkin. Weigh the finished food.",
      "Stir in 1/2 teaspoon of eggshell powder per pound. Cool and portion.",
      scoops
    ],
    notes: mealNote,
    image: "",
    imageCredit: "",
    sourceUrl: "https://www.balanceit.com/",
    sourceTitle: "BalanceIT",
    youtube: "",
    family: true
  },
  {
    id: "dog-meal-week",
    title: "A Week of Dog Meals",
    cuisine: "pets",
    category: "Meals",
    summary: "How to rotate the cooked meals so the dog is not eating one pot forever, and when to call the vet.",
    yieldText: "one dog",
    prepMinutes: 10,
    cookMinutes: 0,
    ingredients: [
      "Two or three different dog meals from this book",
      "Ground eggshell in every batch",
      "A kitchen scale",
      "The dog's usual vet"
    ],
    steps: [
      "Cook one batch, cool it, and freeze it in flat daily packs. Label the pack with the day.",
      "Rotate proteins through the week. Chicken one stretch, beef the next, turkey or fish after that. Keep the liver and the eggshell in every batch.",
      "Thaw a pack in the icebox. Serve it cool or just warm, never hot from the pan.",
      "Use the starting scoops on each meal, split morning and night. Write down the dog's weight once a week.",
      "Stay on the usual vet food if the dog is a puppy, pregnant, sick, or already on a prescription diet, until the vet says otherwise."
    ],
    notes: "These meals are built from muscle meat, about 5 percent liver, vegetables or a plain grain, and calcium from eggshell. They are not a lab-tested diet for every dog. A veterinary nutritionist can match calories, vitamins, and minerals to one animal. BalanceIT, run with board-certified nutritionists, is a place to get that recipe. Call the vet for vomiting, diarrhea, itching, a dull coat, or a weight that keeps moving.",
    image: "",
    imageCredit: "",
    sourceUrl: "https://sites.tufts.edu/petfoodology/2019/01/29/cooking-up-trouble-common-home-cooking-mistakes/",
    sourceTitle: "Tufts: home-cooking mistakes",
    youtube: "",
    family: true
  }
];
