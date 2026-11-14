-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: pru_ai_navigator
-- ------------------------------------------------------
-- Server version	8.0.44

CREATE DATABASE IF NOT EXISTS `pru_ai_navigator`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE `pru_ai_navigator`;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `advisor`
--

DROP TABLE IF EXISTS `advisor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisor` (
  `advisor_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `workload_score` int DEFAULT '0',
  PRIMARY KEY (`advisor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisor`
--

LOCK TABLES `advisor` WRITE;
/*!40000 ALTER TABLE `advisor` DISABLE KEYS */;
INSERT INTO `advisor` VALUES (1,'Wilson','wilson.advisor@example.com','General Prudential ILP',NULL,1),(2,'Daniel Tan','YOUR_EMAIL+advisor2@gmail.com','PRUActive LinkGuard',NULL,0),(3,'Aisha Rahman','YOUR_EMAIL+advisor3@gmail.com','PRUVantage Prosper',NULL,0),(4,'Marcus Lee','YOUR_EMAIL+advisor4@gmail.com','General Prudential ILP',NULL,1),(5,'Clara Wong','YOUR_EMAIL+advisor5@gmail.com','PRUVantage Assure Series',NULL,1),(6,'Ethan Ng','YOUR_EMAIL+advisor6@gmail.com','PRUVantage Wealth III (SGD)',NULL,2),(7,'Nadia Koh','YOUR_EMAIL+advisor7@gmail.com','PRUVantage Wealth II (USD)',NULL,0),(8,'Jason Teo','YOUR_EMAIL+advisor8@gmail.com','PRUUnited Wealth',NULL,1);
/*!40000 ALTER TABLE `advisor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advisoremailpreview`
--

DROP TABLE IF EXISTS `advisoremailpreview`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisoremailpreview` (
  `email_id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` int DEFAULT NULL,
  `subject` text,
  `body` text,
  `recipient_email` varchar(255) DEFAULT NULL,
  `delivery_status` varchar(30) DEFAULT NULL,
  `delivery_reference` varchar(80) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email_id`),
  KEY `meeting_id` (`meeting_id`),
  CONSTRAINT `advisoremailpreview_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `meeting` (`meeting_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisoremailpreview`
--

LOCK TABLES `advisoremailpreview` WRITE;
/*!40000 ALTER TABLE `advisoremailpreview` DISABLE KEYS */;
/*!40000 ALTER TABLE `advisoremailpreview` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advisorslot`
--

DROP TABLE IF EXISTS `advisorslot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisorslot` (
  `slot_id` int NOT NULL AUTO_INCREMENT,
  `advisor_id` int DEFAULT NULL,
  `start_datetime` datetime DEFAULT NULL,
  `end_datetime` datetime DEFAULT NULL,
  `meeting_type` varchar(50) DEFAULT NULL,
  `is_booked` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`slot_id`),
  KEY `advisor_id` (`advisor_id`),
  CONSTRAINT `advisorslot_ibfk_1` FOREIGN KEY (`advisor_id`) REFERENCES `advisor` (`advisor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisorslot`
--

LOCK TABLES `advisorslot` WRITE;
/*!40000 ALTER TABLE `advisorslot` DISABLE KEYS */;
INSERT INTO `advisorslot` VALUES (1,1,'2026-06-25 09:00:00','2026-06-25 09:30:00','Online',0),(2,1,'2026-06-26 14:00:00','2026-06-26 14:30:00','Online',1),(3,1,'2026-06-27 10:00:00','2026-06-27 10:30:00','Offline',0),(4,2,'2026-06-28 13:30:00','2026-06-28 14:00:00','Offline',0),(5,2,'2026-06-29 10:00:00','2026-06-29 10:30:00','Online',0),(6,2,'2026-06-30 16:00:00','2026-06-30 16:30:00','Offline',0),(7,3,'2026-07-01 16:00:00','2026-07-01 16:30:00','Online',0),(8,3,'2026-06-25 14:00:00','2026-06-25 14:30:00','Online',0),(9,3,'2026-06-26 11:00:00','2026-06-26 11:30:00','Offline',0),(10,4,'2026-06-27 10:00:00','2026-06-27 10:30:00','Online',1),(11,4,'2026-06-28 19:00:00','2026-06-28 19:30:00','Online',0),(12,4,'2026-06-29 10:00:00','2026-06-29 10:30:00','Online',0),(13,4,'2026-06-30 15:00:00','2026-06-30 15:30:00','Offline',0),(14,5,'2026-06-25 10:00:00','2026-06-25 10:30:00','Online',0),(15,5,'2026-06-26 15:00:00','2026-06-26 15:30:00','Offline',0),(16,5,'2026-06-27 16:00:00','2026-06-27 16:30:00','Online',1),(17,6,'2026-06-28 11:00:00','2026-06-28 11:30:00','Online',1),(18,6,'2026-06-29 15:00:00','2026-06-29 15:30:00','Online',1),(19,6,'2026-06-30 10:00:00','2026-06-30 10:30:00','Offline',0),(20,7,'2026-06-25 09:00:00','2026-06-25 09:30:00','Online',0),(21,7,'2026-06-26 13:00:00','2026-06-26 13:30:00','Offline',0),(22,7,'2026-06-27 18:00:00','2026-06-27 18:30:00','Online',0),(23,8,'2026-06-28 15:00:00','2026-06-28 15:30:00','Offline',0),(24,8,'2026-06-29 11:00:00','2026-06-29 11:30:00','Online',0),(25,8,'2026-06-27 14:00:00','2026-06-27 14:30:00','Online',1);
/*!40000 ALTER TABLE `advisorslot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advisorsummary`
--

DROP TABLE IF EXISTS `advisorsummary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advisorsummary` (
  `summary_id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` int DEFAULT NULL,
  `customer_summary` text,
  `product_interest` text,
  `questions_asked` text,
  `clarification_points` text,
  `missing_info` text,
  `checklist` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `advisor_questions` text,
  `meeting_agenda` text,
  PRIMARY KEY (`summary_id`),
  KEY `meeting_id` (`meeting_id`),
  CONSTRAINT `advisorsummary_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `meeting` (`meeting_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advisorsummary`
--

LOCK TABLES `advisorsummary` WRITE;
/*!40000 ALTER TABLE `advisorsummary` DISABLE KEYS */;
INSERT INTO `advisorsummary` VALUES (12,1,'Rachel Tan is a 29-year-old Marketing Manager with a medium risk appetite and a main goal of generating monthly income through investment-linked plans. She has a monthly income of S$1,000 and is comfortable paying about S$1,000 monthly premiums for the next 5 to 10 years. She currently holds basic hospital and term life insurance but no ILP. She prefers SGD currency and online meetings. Rachel seeks clarity on product comparisons, premium affordability, income guarantees, and suitable premium terms. She needs guidance on choosing between PRUVantage Prosper, PRUUnited Wealth, and PRUVantage Wealth III (SGD).','PRUVantage Wealth III (SGD)','[\"I want to grow my wealth but I am not sure which product to discuss.\",\"I want monthly income, but are the returns guaranteed? I prefer SGD\",\"Compare PRUVantage Prosper, PRUUnited Wealth, and PRUVantage Wealth III in simple terms.\",\"Im comfortable with paying around 1000 a month for the next 5-10 years\",\"So depending on the information I have given you so far can you help me choose a product I should mainly talk about with the advisor?\",\"What questions should I ask the advisor before deciding?\",\"Can you help me with Python homework?\"]','[\"Clarify that investment-linked plan returns and dividends are not guaranteed and can fluctuate based on market performance.\",\"Explain premium payment terms, minimum premium requirements, and how they fit Rachel\'s budget and time horizon.\",\"Discuss the differences in income payout options, fund choices, and protection features among PRUVantage Prosper, PRUUnited Wealth, and PRUVantage Wealth III (SGD).\",\"Confirm Rachel\'s preferred investment time horizon and premium payment term (5, 10, or longer years).\",\"Clarify flexibility on withdrawals, fund switching, and consequences of early premium cessation or policy surrender.\",\"Explain the risks involved including possible loss of principal and charges deducted from premiums.\"]','[\"Investment time horizon: how long Rachel plans to keep the policy active.\",\"Preferred premium payment term: whether Rachel prefers 5, 10, or longer years.\",\"Existing protection needs: whether Rachel wants protection features included or focuses mainly on investment growth and income.\",\"Comfort with investment risk and understanding that returns and dividends are not guaranteed.\",\"Confirmation on currency preference (though she prefers SGD, explicit confirmation is helpful).\"]','[\"Review Rachel\'s stated premium budget and confirm affordability\",\"Prepare clear explanation of investment risks and non-guaranteed returns based on PRUPath Product Knowledge Document\",\"Have comparison summary of PRUVantage Wealth III, PRUVantage Prosper, and PRUUnited Wealth ready\",\"Prepare to discuss premium payment terms and minimum premium requirements\",\"Clarify charges, fees, and impact on investment returns\",\"Confirm Rachel\'s investment time horizon and protection preferences during meeting\",\"Ensure understanding of withdrawal rules, fund switching, and policy surrender implications\",\"Prepare list of questions to confirm Rachel\'s understanding and suitability\"]','2026-06-16 06:09:29','[\"Rachel, how long do you plan to keep your investment-linked plan active?\",\"Do you prefer to pay premiums over 5 years, 10 years, or are you open to longer premium payment terms?\",\"Are you interested in including protection features such as death or disability benefits in your plan?\",\"Are you comfortable with the fact that investment returns and dividends are not guaranteed and can fluctuate with market conditions?\",\"Would you like a plan that focuses more on monthly income, long-term growth, or a balance of both?\",\"Would you like me to explain the charges and fees involved in these plans in detail?\",\"How important is flexibility in terms of withdrawals, fund switching, or premium top-ups to you?\"]','[\"0-5 min: Introduction and review of Rachel\'s financial goals and risk appetite\",\"5-10 min: Discuss Rachel\'s premium budget, preferred premium term, and investment time horizon\",\"10-15 min: Explain features, risks, and charges of PRUVantage Wealth III (SGD) and compare briefly with PRUVantage Prosper and PRUUnited Wealth\",\"15-20 min: Clarify non-guaranteed nature of returns and dividend income, and address Rachel\'s concerns about guarantees\",\"20-25 min: Explore protection features and flexibility options relevant to Rachel\'s needs\",\"25-30 min: Address Rachel\'s questions, confirm missing information, and outline next steps\"]'),(13,2,'Amanda Tan is a 28-year-old Marketing Executive with a medium risk appetite and a monthly income of $6,200. She currently holds an Integrated Shield Plan and employer-provided group insurance. Her main financial goal is to grow her wealth. The meeting is scheduled online with advisor Sarah Lim, who specializes in PRULink InvestGrowth. Amanda has not yet asked any clarification questions and is considered ready for consultation.','General Prudential ILP, with advisor specialty in PRULink InvestGrowth','[]','[\"Clarify Amanda\'s understanding of investment-linked insurance products and the specific features of PRULink InvestGrowth.\",\"Discuss the suitability of ILPs for her medium risk appetite and wealth growth goal.\",\"Explain the charges, risks, and benefits associated with PRULink InvestGrowth based on her income and existing insurance coverage.\"]','[\"Details on Amanda\'s current savings or investments outside insurance.\",\"Her investment time horizon and liquidity needs.\",\"Any specific preferences or concerns about investment risks or product features.\"]','[\"Review Amanda\'s existing insurance coverage and financial profile\",\"Prepare clear explanation of PRULink InvestGrowth features and risks from PRUPath Product Knowledge Document\",\"Have risk and suitability assessment tools ready\",\"Prepare to discuss charges and potential investment returns realistically\",\"Ensure online meeting setup is tested and ready\",\"Prepare to collect missing information on savings, investment horizon, and preferences\"]','2026-06-25 15:34:12','[\"Can you share more about your current savings or investment plans outside your insurance?\",\"What is your expected time frame for your wealth growth goal?\",\"How comfortable are you with investment risks, especially market fluctuations affecting your investment-linked insurance?\",\"Do you have any specific questions or concerns about how PRULink InvestGrowth works?\",\"Are there any particular benefits or features you are looking for in an investment-linked insurance product?\"]','[\"5 min - Introduction and understanding Amanda\'s financial goals and current situation\",\"10 min - Overview of PRULink InvestGrowth and how it aligns with her medium risk appetite and wealth growth goal\",\"10 min - Discussion on product features, charges, risks, and benefits\",\"5 min - Address Amanda\'s questions and clarify any doubts\",\"Closing - Next steps and scheduling follow-up if needed\"]'),(14,3,'Amanda Tan, 28-year-old Marketing Executive with a medium risk appetite, aims to grow her wealth. She currently holds an Integrated Shield Plan and employer-provided group insurance. She is concerned about understanding investment risks and prefers an online meeting. Monthly income is SGD 6,200. She has expressed interest in Prudential\'s investment-linked plans focused on wealth accumulation.','General Prudential Investment-Linked Plans (Wealth Accumulation category, e.g., PRUVantage Assure Series, PRUVantage Wealth III, PRUVantage Prosper, PRULink InvestGrowth)','[\"I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?\"]','[\"Explain the different Prudential Wealth Accumulation ILP options and their risk profiles.\",\"Clarify the investment risks involved, including the possibility of loss and market volatility.\",\"Discuss charges, premium commitments, and how they affect investment returns.\",\"Confirm the customer\'s preferred currency for the ILP (SGD or USD).\",\"Determine the customer\'s comfortable monthly premium budget for the ILP.\"]','[\"Comfortable monthly premium budget for the investment-linked plan\",\"Preferred currency for the investment-linked plan (SGD or USD)\"]','[\"Confirm Amanda\'s comfortable monthly premium budget\",\"Confirm currency preference (SGD or USD)\",\"Prepare product brochures and risk disclosure materials for Wealth Accumulation ILPs\",\"Review Amanda\'s existing insurance coverage to ensure suitability\",\"Prepare to explain investment risks and charges clearly\",\"Ensure technology setup for smooth online meeting\"]','2026-06-25 16:08:04','[\"What is your comfortable monthly premium budget for this investment-linked plan?\",\"Do you prefer your investment-linked plan to be denominated in Singapore dollars or US dollars?\",\"How familiar are you with investment-linked plans and their associated risks?\",\"Are you looking for any specific features such as income payouts or additional protection?\",\"What is your investment time horizon for this wealth accumulation plan?\",\"Do you have any concerns about liquidity or access to your funds?\"]','[\"5 min - Introduction and understanding Amanda\'s financial goals and risk appetite\",\"10 min - Overview of Prudential Wealth Accumulation ILPs and product features\",\"5 min - Discussion on investment risks, charges, and premium commitments\",\"5 min - Clarify currency preference and premium budget\",\"5 min - Address any questions and next steps\"]'),(15,4,'Amanda Tan, 28-year-old marketing executive with medium risk appetite and monthly income of $6,200, aims to grow wealth while seeking medical coverage and health protection. She currently has an Integrated Shield Plan and employer group insurance. She is interested in critical illness coverage and wants to understand how Prudential\'s investment-linked plans, particularly PRUActive LinkGuard, can complement her existing medical insurance. Meeting is online and scheduled for June 27, 2026.','PRUActive LinkGuard','[\"I want to understand medical coverage and health protection. What should I clarify?\",\"i want critical illness\"]','[\"Clarify the extent of medical coverage and health protection included in PRUActive LinkGuard.\",\"Explain the optional critical illness coverage details and how it complements existing medical insurance.\",\"Discuss how premiums and charges affect coverage and investment value.\",\"Confirm whether critical illness coverage is sought as standalone or part of an ILP.\",\"Clarify affordability and suitability given her medium risk appetite and income.\"]','[\"Are you looking for plans with critical illness or medical coverage in addition to investment-linked protection?\",\"Are you looking for critical illness coverage as a standalone or as part of an investment-linked plan?\"]','[\"Review Amanda\'s existing insurance coverage details\",\"Prepare clear explanation of PRUActive LinkGuard benefits and optional riders\",\"Have illustrations ready showing premium impact and investment performance scenarios\",\"Prepare to discuss risk factors and charges based on PRUPath Product Knowledge Document\",\"Confirm missing information on critical illness coverage preferences before or during meeting\"]','2026-06-25 17:43:47','[\"Can you share more about your expectations for critical illness coverage and how it fits with your current insurance?\",\"Are you comfortable with the investment risks associated with an investment-linked plan like PRUActive LinkGuard?\",\"What is your preferred balance between protection and investment growth?\",\"Do you have a monthly budget in mind for premiums including optional riders?\",\"Would you like me to explain the charges and fees involved in PRUActive LinkGuard?\"]','[\"5 min - Introduction and review of Amanda\'s current insurance and financial goals\",\"10 min - Explain PRUActive LinkGuard features, focusing on protection and optional critical illness coverage\",\"5 min - Discuss how this plan complements her existing Integrated Shield Plan\",\"5 min - Address questions on premiums, charges, investment risks, and affordability\",\"5 min - Confirm suitability and next steps\"]'),(16,5,'Amanda Tan, 28-year-old Marketing Executive with a medium risk appetite, aims to grow her wealth. She has an existing Integrated Shield Plan and employer group insurance. She is interested in investment-linked plans for wealth accumulation, prefers SGD currency, and indicated a tentative monthly budget of around S$1,000 but has not confirmed this. She seeks to understand the risks involved and suitable Prudential product categories. The meeting is online with advisor Clara Wong, focusing on PRUVantage Wealth III (SGD).','PRUVantage Wealth III (SGD)','[\"I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?\",\"1000sgd\"]','[\"Clarify the customer\'s comfortable monthly premium budget for the investment-linked plan.\",\"Confirm the preferred currency denomination for the plan (SGD or USD).\",\"Explain the investment risks and how they align with her medium risk appetite.\",\"Discuss charges, premium affordability, withdrawal rules, and product features specific to PRUVantage Wealth III (SGD).\"]','[\"Confirmed comfortable monthly premium budget for the wealth accumulation plan.\",\"Preferred currency denomination for the investment-linked plan.\"]','[\"Verify customer\'s monthly premium budget and currency preference\",\"Prepare clear explanation of PRUVantage Wealth III (SGD) features, risks, and charges based on PRUPath Product Knowledge Document\",\"Review customer\'s existing insurance coverage for suitability context\",\"Prepare to discuss investment risk and product withdrawal rules\",\"Have illustrations/examples ready to show potential investment growth and charges impact\",\"Confirm customer\'s understanding and comfort with investment-linked plan risks\"]','2026-06-26 04:25:07','[\"Can you confirm your comfortable monthly premium budget for this investment-linked plan?\",\"Do you prefer your investment-linked plan to be denominated in SGD or USD?\",\"How familiar are you with investment-linked plan risks and the potential for investment value fluctuations?\",\"What is your investment time horizon or how long do you plan to stay invested?\",\"Are there any specific features or benefits you are looking for in a wealth accumulation plan?\",\"Would you like to review how charges and fees might impact your investment returns over time?\"]','[\"0-5 min: Introduction and review of customer\'s financial goals and risk appetite\",\"5-10 min: Discuss customer\'s current insurance coverage and how it fits with wealth accumulation plans\",\"10-20 min: Present PRUVantage Wealth III (SGD) product features, risks, charges, and suitability\",\"20-25 min: Address customer\'s questions and clarify premium budget and currency preferences\",\"25-30 min: Summarize next steps, confirm understanding, and schedule follow-up if needed\"]'),(18,6,'Amanda Tan is a 28-year-old marketing executive with a medium risk appetite and a monthly income of SGD 6,200. Her main goal is to grow wealth, and she currently holds an Integrated Shield Plan and employer-provided group insurance. She is interested in investment-linked plans with a budget around SGD 1,000 monthly and wants to understand associated risks. The meeting is online and scheduled for June 29, 2026, with advisor Ethan Ng specializing in PRUVantage Wealth III (SGD).','PRUVantage Wealth III (SGD)','[\"I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?\",\"1000 sgd\"]','[\"Clarify the customer\'s comfortable monthly premium budget for the investment-linked plan.\",\"Confirm currency preference for the investment-linked plan (SGD or USD).\",\"Explain the investment risks involved with PRUVantage Wealth III (SGD) and how it aligns with her medium risk appetite.\",\"Discuss how charges, premiums, and withdrawals work for the chosen plan.\",\"Confirm suitability of PRUVantage Wealth III (SGD) compared to other Prudential wealth accumulation products.\"]','[\"Comfortable monthly premium budget for the investment-linked plan (despite mention of SGD 1,000, confirm affordability).\",\"Preferred currency for the investment-linked plan (SGD or USD).\"]','[\"Verify Amanda\'s monthly premium budget and confirm currency preference\",\"Prepare clear explanations on investment risks and how they relate to medium risk appetite\",\"Review PRUVantage Wealth III (SGD) product details, including charges and benefits\",\"Have comparison points ready for other wealth accumulation products if needed\",\"Ensure online meeting setup is tested and ready\",\"Prepare to discuss suitability and affordability based on Amanda\'s profile\"]','2026-06-26 05:39:08','[\"Can you confirm your comfortable monthly premium budget for this investment-linked plan?\",\"Do you have a preference for the currency denomination of your investment-linked plan, SGD or USD?\",\"How familiar are you with investment-linked insurance products and their associated risks?\",\"What is your investment time horizon for growing your wealth?\",\"Are there any specific features or benefits you are looking for in a wealth accumulation plan?\",\"Would you like to understand how charges and fees might affect your investment returns over time?\"]','[\"5 min - Introduction and review of Amanda\'s financial profile and goals\",\"7 min - Overview of PRUVantage Wealth III (SGD) and its features\",\"7 min - Discussion on investment risks, charges, premiums, and withdrawal options\",\"5 min - Clarify currency preference and affordability to confirm suitability\",\"4 min - Address Amanda\'s questions and concerns about wealth growth and risk\",\"2 min - Next steps and follow-up actions\"]');
/*!40000 ALTER TABLE `advisorsummary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chatmessage`
--

DROP TABLE IF EXISTS `chatmessage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatmessage` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL,
  `message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `chatmessage_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chatmessage`
--

LOCK TABLES `chatmessage` WRITE;
/*!40000 ALTER TABLE `chatmessage` DISABLE KEYS */;
INSERT INTO `chatmessage` VALUES (68,24,'user','I want to grow my wealth but I am not sure which product to discuss.','2026-06-16 05:35:51'),(69,24,'assistant','Hi Rachel! Since your main goal is to grow your wealth with a medium risk appetite and you have a steady monthly income, there are several Prudential investment-linked plans that could be worth discussing with your Financial Representative. These plans focus on long-term wealth growth but do not guarantee returns, so it\'s important to understand the investment risks and charges involved. For example, PRUVantage Assure Series offers wealth growth with some protection features, while PRUVantage Wealth III (SGD) focuses on SGD-based long-term wealth and income potential. PRUVantage Prosper provides flexibility between growth and possible dividend income. PRULink InvestGrowth offers flexible investment options with CPF or cash funding. Your advisor can help clarify details like premium affordability, fund choices, and how each plan fits your goals and risk comfort. It’s best to prepare questions about premium terms, charges, withdrawal rules, and how dividends or bonuses work to get a clearer picture during your meeting.','2026-06-16 05:35:51'),(70,24,'user','I want monthly income, but are the returns guaranteed? I prefer SGD','2026-06-16 05:36:57'),(71,24,'assistant','Hi Rachel! For Prudential investment-linked plans that offer monthly income options, such as PRUVantage Wealth III (SGD), PRUVantage Prosper, and PRUUnited Wealth, the income usually comes from dividends paid by the investment funds. However, it\'s important to know that these dividends and returns are not guaranteed. The amount you receive can vary depending on how the funds perform and market conditions. Since you prefer SGD and want monthly income, these plans could be relevant to discuss with your advisor. They can explain how the dividend payouts work, the risks involved, and how charges and withdrawals may affect your income.','2026-06-16 05:36:57'),(72,24,'user','Compare PRUVantage Prosper, PRUUnited Wealth, and PRUVantage Wealth III in simple terms.','2026-06-16 05:37:45'),(73,24,'assistant','Hi Rachel! Here\'s a simple comparison of the three plans you asked about, all of which can help grow your wealth with monthly income options in SGD, but none guarantee returns or dividends:\n\n- PRUVantage Prosper focuses on long-term wealth growth with flexibility between Growth Account (for accumulation) and Flex Account (for dividend payouts). It supports legacy planning and offers bonuses, but dividends and investment returns are not guaranteed.\n\n- PRUUnited Wealth combines income, growth, and protection with a shorter premium payment term of 5 or 10 years. It offers monthly income potential from dividend-paying funds and death coverage, but again, dividends and returns are not guaranteed. It may suit those wanting a shorter premium commitment.\n\n- PRUVantage Wealth III (SGD) is designed for long-term wealth building with access to PRUPrime CIO Funds and PRULink funds. It offers monthly income from dividend-paying funds and legacy planning features. Like the others, dividends and returns are not guaranteed.\n\nAll three plans involve investment risk, fees, and charges that your advisor can explain. Since you prefer SGD and want monthly income with medium risk, these plans could be relevant to discuss with your advisor to see which fits your affordability, risk comfort, and income needs best.','2026-06-16 05:37:45'),(74,24,'user','Im comfortable with paying around 1000 a month for the next 5-10 years','2026-06-16 05:38:36'),(75,24,'assistant','Hi Rachel! Since you\'re comfortable paying about S$1,000 a month for the next 5 to 10 years, here’s a simple comparison of the three plans you asked about that fit this budget and time frame:\n\n- PRUVantage Prosper offers flexibility between Growth and Flex Accounts for long-term wealth growth and possible monthly dividends. It requires a minimum premium of around S$18,000 to S$36,000 per year depending on the term, so S$1,000 per month (S$12,000 per year) may be slightly below the minimum for shorter terms but could fit longer premium terms. Dividends and returns are not guaranteed.\n\n- PRUUnited Wealth has a lower minimum premium requirement (S$8,000 per year for 5 years or S$5,000 per year for 10 years) and offers monthly income potential, growth, and protection with a shorter premium term. Your budget fits well here, and it may suit those wanting income and growth with a defined premium period.\n\n- PRUVantage Wealth III (SGD) generally requires higher minimum premiums (from S$36,000 per year for 5 years down to S$15,000 per year for 20 years). At S$1,000 per month, it may be more affordable with longer premium terms like 15 or 20 years. It focuses on long-term wealth building, monthly income, and legacy planning.\n\nAll these plans involve investment risks and charges, and dividends or income are not guaranteed. Your Prudential Financial Representative can help clarify affordability, premium terms, fund choices, and how each plan fits your goals and risk comfort.\n\nIt’s good to prepare questions about premium commitment, charges, withdrawal rules, and dividend options for your meeting.','2026-06-16 05:38:36'),(76,24,'user','So depending on the information I have given you so far can you help me choose a product I should mainly talk about with the advisor?','2026-06-16 05:39:39'),(77,24,'assistant','Hi Rachel! Based on your goal to grow wealth with a medium risk appetite and your comfort with paying about S$1,000 a month for the next 5 to 10 years, several Prudential investment-linked plans could be relevant to discuss with your Financial Representative. Since you prefer SGD and want potential monthly income, PRUVantage Prosper, PRUUnited Wealth, and PRUVantage Wealth III (SGD) are worth exploring. PRUVantage Prosper offers flexibility between growth and income with possible dividends, PRUUnited Wealth combines income, growth, and protection with a shorter premium term that fits your budget, and PRUVantage Wealth III focuses on long-term wealth building with access to professional fund management. Each plan involves investment risk and non-guaranteed returns, so your advisor can help clarify charges, premium terms, dividend options, and how each plan fits your goals and affordability. It’s a good idea to prepare questions about premium commitment, withdrawal rules, and income options for your meeting. Your advisor will help confirm which product aligns best with your needs and risk comfort.','2026-06-16 05:39:39'),(78,24,'user','What questions should I ask the advisor before deciding?','2026-06-16 05:40:26'),(79,24,'assistant','Hi Rachel! Before deciding, it’s good to ask your Prudential Financial Representative questions like: What are the total charges and fees involved in the plan? How do the premium payment terms and minimum amounts fit my budget? What are the risks, including investment risk and possible loss of principal? How do dividend payouts or monthly income options work, and are they guaranteed? What flexibility do I have for withdrawals, fund switching, and top-ups? How does the protection coverage work, especially death and accidental disability benefits? What happens if I want to stop paying premiums early or surrender the policy? And finally, how does the plan fit my medium risk appetite and long-term wealth growth goal? Your advisor can explain these in detail and help you understand which product features align best with your needs.','2026-06-16 05:40:26'),(80,24,'user','Can you help me with Python homework?','2026-06-16 05:41:02'),(81,24,'assistant','I can only help with questions related to Prudential investment-linked insurance products, your profile, product features, risks, charges, and preparing for a meeting with a Prudential Financial Representative.','2026-06-16 05:41:02'),(82,27,'user','I\'m not sure what type of insurance coverage I need. Can you guide me through the main areas?','2026-06-24 15:18:54'),(83,27,'assistant','Hi Amanda! Since your main goal is to grow wealth and you already have some health protection through your Integrated Shield Plan and employer group insurance, you might want to focus on insurance that supports Wealth Accumulation and also provides some Life Protection. The main areas of insurance coverage to consider are: 1) Health Protection, which covers medical expenses and critical illnesses; 2) Life Protection, which provides financial support to your loved ones if you pass away or become disabled; 3) Wealth Accumulation, which helps you grow your money over time through investment-linked plans; and 4) Legacy Planning, which is about passing on wealth to your beneficiaries. Since you want to grow wealth with medium risk appetite, investment-linked plans with a balance of growth and protection could be relevant to discuss with your Prudential Financial Representative. They can help you understand how these plans work, including risks, charges, and flexibility. Would you like me to help you prepare questions about these areas for your meeting?','2026-06-24 15:18:54'),(84,27,'user','I\'m not sure what type of insurance coverage I need. Can you guide me through the main areas?','2026-06-24 15:21:38'),(85,27,'assistant','Hi Amanda! Since you want to grow your wealth and already have health protection through your Integrated Shield Plan and employer insurance, you might want to focus on insurance that helps with Wealth Accumulation and some Life Protection. The main insurance areas are: 1) Health Protection, which covers medical costs and critical illnesses; 2) Life Protection, which supports your loved ones if you pass away or become disabled; 3) Wealth Accumulation, which helps grow your money over time through investment-linked plans; and 4) Legacy Planning, which is about passing on wealth to your beneficiaries. Based on your medium risk appetite and goal to grow wealth, investment-linked plans that balance growth and protection could be relevant to discuss with your Prudential Financial Representative. They can explain how these plans work, including risks, charges, and flexibility. Would you like help preparing questions for your meeting?','2026-06-24 15:21:38'),(86,27,'user','I\'m not sure what type of insurance coverage I need. Can you guide me through the main areas?','2026-06-24 15:28:53'),(87,27,'assistant','Hi Amanda! Since your main goal is to grow your wealth and you already have health protection through your Integrated Shield Plan and employer insurance, you might want to focus on insurance that supports Wealth Accumulation and some Life Protection. The main insurance areas to consider are: 1) Health Protection, which covers medical costs and critical illnesses; 2) Life Protection, which provides financial support to your loved ones if you pass away or become disabled; 3) Wealth Accumulation, which helps grow your money over time through investment-linked plans; and 4) Legacy Planning, which is about passing on your wealth to beneficiaries. Based on your medium risk appetite and goal to grow wealth, investment-linked plans that balance growth and protection could be relevant to discuss with your Prudential Financial Representative. They can explain how these plans work, including risks, charges, and flexibility. Would you like help preparing questions for your meeting?','2026-06-24 15:28:53'),(88,27,'user','I\'m not sure what type of insurance coverage I need. Can you guide me through the main areas?','2026-06-24 15:38:02'),(89,27,'assistant','Hi Amanda! Since your main goal is to grow your wealth and you already have health protection through your Integrated Shield Plan and employer insurance, you might want to focus on insurance that supports Wealth Accumulation and some Life Protection. The main insurance areas to consider are: 1) Health Protection, which covers medical costs and critical illnesses; 2) Life Protection, which provides financial support to your loved ones if you pass away or become disabled; 3) Wealth Accumulation, which helps grow your money over time through investment-linked plans; and 4) Legacy Planning, which is about passing on your wealth to beneficiaries. Based on your medium risk appetite and goal to grow wealth, investment-linked plans that balance growth and protection could be relevant to discuss with your Prudential Financial Representative. They can explain how these plans work, including risks, charges, and flexibility. Would you like help preparing questions for your meeting?','2026-06-24 15:38:02'),(90,27,'user','What information is still missing from my profile before my advisor meeting?','2026-06-24 15:49:09'),(91,27,'assistant','Hi Amanda! To help your Prudential Financial Representative prepare well for your meeting and suggest the best options for your goal of growing wealth with medium risk, a few more details would be helpful. These include: your monthly premium budget or how much you are comfortable paying for insurance; whether you prefer your investment in Singapore Dollars (SGD) or US Dollars (USD); if you want any life protection coverage alongside wealth growth; and whether you prefer income (like monthly dividends) or purely long-term growth from your investment. Also, it helps to know if you have any plans for withdrawals or top-ups in the future. Sharing these will make your meeting more productive and tailored to your needs.','2026-06-24 15:49:09'),(92,27,'user','I want to understand medical coverage and health protection. What should I clarify?','2026-06-24 15:50:25'),(93,27,'assistant','Hi Amanda! Since you already have an Integrated Shield Plan and employer group insurance, you have some medical and health protection coverage. For your meeting, you may want to clarify with your Prudential Financial Representative if you need additional health protection such as critical illness or total permanent disability coverage, which are not covered by your current plans. You can also ask about how Prudential’s health protection products work, what illnesses or conditions are covered, and any waiting periods or exclusions. It’s important to understand the premiums, coverage limits, and how these health protection plans complement your existing insurance. This will help you decide if you want to add health protection alongside your wealth accumulation goals.','2026-06-24 15:50:25'),(94,27,'user','I am comfortable with paying 2k SGD a month which plans are an option for me?','2026-06-24 15:52:04'),(95,27,'assistant','Hi Amanda! With a monthly budget of about S$2,000, several Prudential investment-linked plans could be relevant to discuss with your Financial Representative based on your goal to grow wealth and medium risk appetite. For example, PRUVantage Assure II offers regular premium plans starting from about S$1,800 per year for longer terms, but typically the minimum premiums are annual amounts, so your monthly budget may allow you to consider plans with premium terms like 10 or 15 years. PRUVantage Wealth III usually requires higher minimum annual premiums, so it might be less affordable at this budget. PRUUnited Wealth has minimums starting from S$5,000 per year, which could be within reach. PRULink InvestGrowth offers flexible single or recurrent single premiums starting from S$300 per month, which fits your budget and allows flexibility with top-ups and withdrawals. PRUActive LinkGuard starts from as low as S$75 per month but focuses more on protection with investment. Since your main goal is wealth growth, plans like PRUVantage Assure II, PRUUnited Wealth, and PRULink InvestGrowth may be worth asking your advisor about. Your advisor can clarify premium payment terms, investment risk, charges, and how these plans fit your needs. Would you like me to help prepare questions for your meeting?','2026-06-24 15:52:04'),(96,27,'user','SGD','2026-06-24 15:53:00'),(97,27,'assistant','Hi Amanda! Since you prefer to invest in Singapore Dollars (SGD) and are comfortable paying about S$2,000 per month, several Prudential plans may be relevant to discuss with your Financial Representative. PRUVantage Assure II offers a regular premium plan with premium terms from 5 to 25 years and includes wealth protection features like Wealth Assure Value. PRUUnited Wealth provides a shorter premium term option (5 or 10 years) with a focus on income, growth, and protection. PRULink InvestGrowth offers flexible monthly recurrent single premiums starting from S$300, allowing you to top-up or withdraw as needed. PRUVantage Wealth III usually requires higher premiums, so it may be less affordable at your budget. Your advisor can explain the premium terms, charges, investment risks, and how each plan aligns with your medium risk appetite and wealth growth goal. Would you like help preparing specific questions for your meeting?','2026-06-24 15:53:00'),(98,27,'user','10 years and I have 3 people dependent on me in total','2026-06-24 15:53:50'),(99,27,'assistant','Hi Amanda! Since you plan to invest over 10 years and have 3 dependents relying on you, it’s important to consider both wealth accumulation and adequate life protection. For a 10-year premium term with medium risk appetite and SGD currency preference, plans like PRUVantage Assure II, PRUUnited Wealth, and PRULink InvestGrowth may be relevant to discuss with your Prudential Financial Representative. PRUVantage Assure II offers investment-linked wealth growth with protection features like death and accidental disability coverage, which could help protect your dependents financially. PRUUnited Wealth also provides protection plus potential monthly income and shorter premium terms. PRULink InvestGrowth offers flexible investment options with death coverage, allowing you to adjust premiums and withdrawals as needed. Your advisor should clarify the exact coverage amounts, premium affordability, charges, and how these plans can support your dependents if something happens to you. It’s best to discuss your dependents’ financial needs and how much protection you want alongside your wealth growth goals during your meeting.','2026-06-24 15:53:50'),(100,27,'user','I\'m okay with up to 500','2026-06-24 15:54:39'),(101,27,'assistant','Hi Amanda! If your monthly premium budget is up to S$500, some Prudential investment-linked plans may be less affordable because many require higher minimum premiums, especially for shorter premium terms. For example, PRUVantage Assure II regular premium plans start from about S$150 per month for a 25-year term (S$1,800 p.a.), which could fit your budget if you choose a longer premium term. PRULink InvestGrowth offers flexible recurrent single premiums starting from S$300 per month, which might also suit your budget and allow you to adjust top-ups or withdrawals. However, plans like PRUUnited Wealth or PRUVantage Wealth III usually require higher premiums and may not be affordable at S$500 per month. It’s important to discuss with your Prudential Financial Representative how premium terms, investment risk, charges, and protection features fit your budget and goals. Would you like help preparing questions to clarify these points at your meeting?','2026-06-24 15:54:39'),(102,29,'user','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-25 15:53:33'),(103,29,'assistant','Since your main goal is to grow wealth and you have a medium risk appetite, it would be good to discuss Prudential\'s Wealth Accumulation products. These are investment-linked plans that let you invest in funds with the potential for long-term growth, but keep in mind that investment returns are not guaranteed and values can go up or down. You might want to explore plans like PRUVantage Assure Series, PRUVantage Wealth III (SGD), PRUVantage Prosper, or PRULink InvestGrowth, which focus on wealth growth with different features such as income options or protection elements. It’s important to understand the risks, charges, and premium commitments involved, so your Prudential Financial Representative can help explain these in detail and find what fits your situation best.','2026-06-25 15:53:33'),(104,30,'user','I want to understand medical coverage and health protection. What should I clarify?','2026-06-25 17:37:39'),(105,30,'assistant','Hi Amanda! Since you want to understand medical coverage and health protection, it\'s good to know that Prudential\'s investment-linked plans mainly focus on combining investment with some protection features like death and accidental disability coverage. However, most of these plans do not include critical illness or comprehensive medical coverage. For example, PRUActive LinkGuard offers protection for death, terminal illness, and total permanent disability, along with optional critical illness coverage. Your existing Integrated Shield Plan already provides medical coverage, so you might want to clarify with the Prudential Financial Representative how these plans can complement your current medical insurance. It\'s important to ask about what types of health protection are included, any additional riders or benefits for critical illness, and how premiums and charges might affect your coverage and investment value. Remember, investment-linked plans carry investment risks and returns are not guaranteed. Your advisor can help you understand the balance between protection and investment based on your needs.','2026-06-25 17:37:39'),(106,30,'user','i want critical illness','2026-06-25 17:40:22'),(107,30,'assistant','Hi Amanda! Since you want critical illness coverage, it\'s important to know that most Prudential investment-linked plans do not include critical illness protection as a standard feature. However, PRUActive LinkGuard is a plan that offers optional critical illness coverage along with protection for death, terminal illness, and total permanent disability. Your existing Integrated Shield Plan already provides medical coverage, but you could ask the Prudential Financial Representative how PRUActive LinkGuard\'s critical illness benefits might complement your current insurance. Remember, investment-linked plans carry investment risks and returns are not guaranteed. It would be good to clarify with the advisor about the details of critical illness coverage, how premiums and charges affect your policy, and whether this fits your monthly budget and risk appetite.','2026-06-25 17:40:22'),(108,31,'user','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-26 04:11:37'),(109,31,'assistant','Since your main goal is to grow your wealth with a medium risk appetite, it would be good to discuss Prudential\'s Wealth Accumulation products. These are investment-linked plans designed to help you build long-term wealth through investments in various funds, but please remember that investment returns are not guaranteed and the value can go up or down. You may also want to explore options that offer some protection features alongside wealth growth, so you can balance growth with security. A Prudential Financial Representative can explain the risks, charges, and how these plans work in detail to help you make an informed decision.','2026-06-26 04:11:37'),(110,32,'user','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-26 04:21:14'),(111,32,'assistant','Hi Amanda! Since your main goal is to grow your wealth with a medium risk appetite, you should focus your discussion with the Prudential Financial Representative on the Wealth Accumulation category. This includes investment-linked plans designed for long-term wealth growth, such as PRUVantage Assure Series, PRUVantage Wealth III (SGD), PRUVantage Prosper, and PRULink InvestGrowth. These products offer different fund options and features like dividend income or bonuses, but it\'s important to understand that investment returns are not guaranteed and values can go up or down. You may also want to touch on Life Protection to ensure you have basic coverage alongside your wealth plans, especially since you already have an Integrated Shield Plan and group insurance. Be sure to ask the advisor about charges, premium affordability, withdrawal rules, and how each product aligns with your risk comfort. This will help you understand the risks involved and make an informed decision.','2026-06-26 04:21:14'),(112,32,'user','1000sgd','2026-06-26 04:23:08'),(113,32,'assistant','With a monthly budget of around S$1,000 to grow your wealth and considering your medium risk appetite, you could discuss with the Prudential Financial Representative investment-linked plans that focus on long-term wealth accumulation and offer flexibility. Products like PRUVantage Assure Series, PRUVantage Wealth III (SGD), PRUVantage Prosper, PRUUnited Wealth, and PRULink InvestGrowth may be relevant to explore. Each has different features such as protection elements, dividend options, premium terms, and fund choices. It\'s important to ask the advisor about how charges, investment risks, and withdrawal rules apply to your budget and goals, so you can understand what fits your needs. Since you prefer SGD currency and want to grow wealth, these options could be worth discussing. The advisor can help confirm affordability and suitability based on your full financial picture.','2026-06-26 04:23:08'),(114,33,'user','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-26 05:19:11'),(115,33,'assistant','Since your main goal is to grow wealth and you have a medium risk appetite, you should discuss Prudential\'s Wealth Accumulation products. These are investment-linked plans designed to help you build long-term wealth through investments in various funds. It\'s important to understand that these products carry investment risks, meaning the value of your investment can go up or down, and returns are not guaranteed. You may want to ask the Financial Representative about options that balance growth potential with some protection features, as well as how charges, premiums, and withdrawals work. Given your profile, plans like PRUVantage Assure Series, PRUVantage Wealth III (SGD), or PRUVantage Prosper could be relevant to discuss, but the advisor will help confirm which best fits your needs and affordability.','2026-06-26 05:19:11'),(116,33,'user','1000 sgd','2026-06-26 05:19:41'),(117,33,'assistant','With a monthly budget of around S$1,000 to grow your wealth and considering your medium risk appetite, you could discuss with the Prudential Financial Representative investment-linked plans that offer long-term wealth accumulation and some flexibility. Products like PRUVantage Assure Series, PRUVantage Wealth III (SGD), PRUVantage Prosper, and PRULink InvestGrowth may be relevant to explore. These plans allow you to invest in various funds with potential growth, but remember that investment returns are not guaranteed and the value can go up or down. The advisor can help confirm which product aligns best with your budget, risk comfort, and goals.','2026-06-26 05:19:41'),(118,34,'user','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-26 05:28:09'),(119,34,'assistant','Hi Amanda! Since your main goal is to grow your wealth with a medium risk appetite, you should focus on Prudential\'s Wealth Accumulation products. These are investment-linked plans designed to help your money grow over the long term, but please remember that investment returns are not guaranteed and the value can go up or down depending on market performance. You may want to discuss products like PRUVantage Assure Series, PRUVantage Wealth III (SGD), PRUVantage Prosper, PRUUnited Wealth, or PRULink InvestGrowth with your Prudential Financial Representative. Each offers different features such as dividend options, fund choices, and premium terms. It’s important to clarify your monthly premium budget, preferred currency (SGD or USD), and how comfortable you are with investment risk during your meeting. Your existing insurance covers health protection, so focusing on wealth accumulation products could align well with your goals. Make sure to ask the advisor about charges, withdrawal rules, and how investment risks are managed in these plans.','2026-06-26 05:28:09'),(120,35,'user','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-07-03 07:50:59'),(121,35,'assistant','Since your main goal is to grow your wealth and you have a medium risk appetite, you should discuss Prudential\'s Wealth Accumulation products with your Financial Representative. These plans focus on long-term investment-linked growth and may offer options for dividend income and legacy planning. It\'s important to understand that investment returns are not guaranteed and the value can go up or down depending on market performance. You can also ask about how charges, premiums, and withdrawal rules affect your investment. Based on your profile, products like PRUVantage Assure Series, PRUVantage Wealth III (SGD), and PRUVantage Prosper may be relevant to discuss, but your advisor will help confirm which fits your needs best.','2026-07-03 07:50:59');
/*!40000 ALTER TABLE `chatmessage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `monthly_income` decimal(10,2) DEFAULT NULL,
  `risk_appetite` varchar(50) DEFAULT NULL,
  `main_goal` varchar(100) DEFAULT NULL,
  `existing_insurance` text,
  `preferred_meeting_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer`
--

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
INSERT INTO `customer` VALUES (1,'Amanda Tan',28,'Marketing Executive',4800.00,'Medium','Grow wealth','','Online','2026-06-12 13:55:36'),(2,'Amanda Tan',28,'Marketing Executive',4800.00,'Medium','Grow wealth','','Online','2026-06-12 13:55:57'),(3,'Amanda Tan',28,'Marketing Executive',4800.00,'Medium','Grow wealth','','Online','2026-06-12 13:56:16'),(4,'Amanda Tan',28,'Marketing Executive',4800.00,'Medium','Grow wealth','','Online','2026-06-12 13:56:29'),(5,'Hein Htet Aung',20,'It consultant',3000.00,'Medium','Retirement planning','','Online','2026-06-12 13:59:55'),(6,'Hein Htet Aung',20,'It consultant',3000.00,'Medium','Grow wealth','r.ef,ew,','Online','2026-06-12 14:11:08'),(7,'Amanda Tan',28,'Marketing Executive',2000.00,'Low','Grow wealth','lewfemf','Offline','2026-06-12 14:32:33'),(8,'Amanda Tan',28,'Marketing Executive',2000.00,'','','','Online','2026-06-12 15:28:49'),(9,'Amanda Tan',28,'Marketing Executive',2000.00,'Medium','','','Online','2026-06-12 15:29:24'),(10,'Amanda Tan',28,'Marketing Executive',NULL,NULL,NULL,NULL,'Online','2026-06-12 15:31:14'),(11,'Amanda Tan',28,'Marketing Executive',NULL,NULL,NULL,NULL,'Online','2026-06-12 15:33:51'),(12,'Amanda Tan',28,'Marketing Executive',NULL,NULL,NULL,NULL,'Online','2026-06-13 14:23:09'),(13,'Amanda Tan',28,'Marketing Executive',NULL,NULL,NULL,NULL,'Online','2026-06-13 14:24:25'),(14,'Amanda Tan',28,'Marketing Executive',NULL,NULL,NULL,NULL,'Online','2026-06-13 14:58:47'),(15,'Amanda Tan',28,'Marketing Executive',NULL,NULL,NULL,NULL,'Online','2026-06-14 13:19:36'),(16,'Louis',18,'It professional',3000.00,'Medium','Grow wealth','No.','Online','2026-06-14 14:16:58'),(17,'Test User',30,'Tester',5000.00,'Medium','test','none','Online','2026-06-15 12:38:30'),(18,'William',19,'It professional',5000.00,'Medium','Grow wealth','No existing insurance as of now.','Offline','2026-06-15 13:17:09'),(19,'Amanda Tan',28,'Marketing Executive',4800.00,'Medium',NULL,NULL,'Online','2026-06-15 13:56:28'),(20,'Amanda Tan',28,'Marketing Executive',4800.00,'Medium',NULL,NULL,'Online','2026-06-15 14:43:17'),(21,'Amanda Tan',28,'Marketing Executive',4800.00,'Medium',NULL,NULL,'Online','2026-06-15 15:47:03'),(22,'Amanda Tan',28,'Marketing Executive',4800.00,'Medium',NULL,NULL,'Online','2026-06-15 15:51:36'),(23,'Amanda Tan',28,'Marketing Executive',NULL,NULL,NULL,NULL,'Online','2026-06-15 16:13:08'),(24,'Rachel Tan',29,'Marketing Manager',1000.00,'Medium','monthly income','Basic hospital insurance and term life insurance, but no investment-linked plan.','Online','2026-06-16 05:35:21'),(25,'Amanda Tan',28,'Marketing Executive',NULL,NULL,NULL,NULL,'Online','2026-06-24 13:28:36'),(26,'Amanda Tan',28,'Marketing Executive',6200.00,'Medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-24 14:38:38'),(27,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-24 15:08:31'),(28,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-25 14:27:27'),(29,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-25 15:51:05'),(30,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-25 17:37:12'),(31,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-26 04:11:16'),(32,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-26 04:20:46'),(33,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-26 05:18:40'),(34,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-06-26 05:27:20'),(35,'Amanda Tan',28,'Marketing Executive',6200.00,'medium','Grow wealth','Integrated Shield Plan and employer-provided group insurance.','Online','2026-07-03 07:49:52');
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customertag`
--

DROP TABLE IF EXISTS `customertag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customertag` (
  `tag_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `tag_name` varchar(100) DEFAULT NULL,
  `source_question` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tag_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `customertag_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customertag`
--

LOCK TABLES `customertag` WRITE;
/*!40000 ALTER TABLE `customertag` DISABLE KEYS */;
INSERT INTO `customertag` VALUES (5,24,'Guaranteed returns','I want monthly income, but are the returns guaranteed? I prefer SGD','2026-06-16 05:36:57'),(6,24,'Affordability','I want monthly income, but are the returns guaranteed? I prefer SGD','2026-06-16 05:36:57'),(7,29,'Investment risk','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-25 15:53:33'),(8,31,'Investment risk','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-26 04:11:37'),(9,32,'Investment risk','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-26 04:21:14'),(10,33,'Investment risk','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-26 05:19:11'),(11,34,'Investment risk','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-06-26 05:28:09'),(12,35,'Investment risk','I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','2026-07-03 07:50:59');
/*!40000 ALTER TABLE `customertag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meeting`
--

DROP TABLE IF EXISTS `meeting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meeting` (
  `meeting_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `advisor_id` int DEFAULT NULL,
  `meeting_type` varchar(50) DEFAULT NULL,
  `meeting_datetime` datetime DEFAULT NULL,
  `product_interest` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Booked',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `slot_id` int DEFAULT NULL,
  PRIMARY KEY (`meeting_id`),
  KEY `customer_id` (`customer_id`),
  KEY `advisor_id` (`advisor_id`),
  CONSTRAINT `meeting_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  CONSTRAINT `meeting_ibfk_2` FOREIGN KEY (`advisor_id`) REFERENCES `advisor` (`advisor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meeting`
--

LOCK TABLES `meeting` WRITE;
/*!40000 ALTER TABLE `meeting` DISABLE KEYS */;
INSERT INTO `meeting` VALUES (1,24,6,'Online','2026-06-22 11:00:00','PRUVantage Wealth III (SGD)','Booked','2026-06-16 06:05:29',17),(2,28,1,'Online','2026-06-26 14:00:00','General Prudential ILP','Booked','2026-06-25 15:31:26',2),(3,29,4,'Online','2026-06-27 10:00:00','General Prudential ILP','Booked','2026-06-25 16:06:36',10),(4,30,8,'Online','2026-06-27 14:00:00','PRUActive LinkGuard','Booked','2026-06-25 17:42:59',25),(5,32,5,'Online','2026-06-27 16:00:00','PRUVantage Wealth III (SGD)','Booked','2026-06-26 04:24:43',16),(6,33,6,'Online','2026-06-29 15:00:00','PRUVantage Wealth III (SGD)','Booked','2026-06-26 05:21:34',18);
/*!40000 ALTER TABLE `meeting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `missinginfo`
--

DROP TABLE IF EXISTS `missinginfo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `missinginfo` (
  `missing_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `field_name` varchar(100) DEFAULT NULL,
  `question` text,
  `is_answered` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`missing_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `missinginfo_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `missinginfo`
--

LOCK TABLES `missinginfo` WRITE;
/*!40000 ALTER TABLE `missinginfo` DISABLE KEYS */;
INSERT INTO `missinginfo` VALUES (45,24,'premium budget','What is your preferred monthly or annual premium budget for this investment-linked plan?',1,'2026-06-16 05:35:51'),(46,24,'investment time horizon','How long do you plan to invest or keep the policy active?',0,'2026-06-16 05:35:51'),(47,24,'currency preference','Do you prefer your investment to be in Singapore dollars (SGD) or are you open to US dollars (USD)?',0,'2026-06-16 05:35:51'),(48,24,'preferred premium term','Do you prefer to pay premiums for 5 years or 10 years, or are you open to longer premium terms?',0,'2026-06-16 05:38:36'),(49,24,'income vs growth preference','Would you like your plan to focus more on monthly income, long-term growth, or a balance of both?',1,'2026-06-16 05:38:36'),(50,24,'existing protection needs','Do you want your investment-linked plan to include any protection features, or are you mainly focused on investment growth and income?',0,'2026-06-16 05:38:36'),(51,24,'premium payment term preference','Do you prefer a shorter premium payment term like 5 or 10 years, or a longer term such as 15 or 20 years?',0,'2026-06-16 05:40:26'),(52,24,'monthly income vs growth preference','Would you like your plan to focus more on monthly income payouts, long-term growth, or a balance of both?',1,'2026-06-16 05:40:26'),(53,24,'comfort with investment risk and non-guaranteed returns','Are you comfortable with the fact that investment returns and dividends are not guaranteed and can fluctuate?',0,'2026-06-16 05:40:26'),(54,25,'monthly_income','What is your monthly income?',0,'2026-06-24 13:28:36'),(55,25,'risk_appetite','Are you more comfortable with low, medium, or high investment risk?',0,'2026-06-24 13:28:36'),(56,25,'main_goal','What is your main financial goal right now?',0,'2026-06-24 13:28:36'),(57,25,'existing_insurance','Do you currently have any insurance coverage?',0,'2026-06-24 13:28:36'),(58,27,'monthly_income','What is your comfortable monthly premium budget for this insurance?',0,'2026-06-24 15:28:53'),(59,27,'general','Do you prefer your investment-linked plan to be in SGD or USD?',0,'2026-06-24 15:28:53'),(60,27,'existing_insurance','Can you share more about the coverage limits and benefits of your Integrated Shield Plan and employer group insurance?',0,'2026-06-24 15:50:25'),(61,27,'main_goal','Do you prefer your investment to focus more on long-term growth, monthly income (dividends), or a balance of both?',0,'2026-06-24 15:53:00'),(62,29,'monthly_income','What is your comfortable monthly premium budget for this investment-linked plan?',0,'2026-06-25 15:53:33'),(63,29,'general','Do you prefer your investment-linked plan to be in Singapore dollars (SGD) or US dollars (USD)?',0,'2026-06-25 15:53:33'),(64,30,'general','Are you looking for plans with critical illness or medical coverage in addition to investment-linked protection?',0,'2026-06-25 17:37:39'),(65,30,'existing_insurance','Are you looking for critical illness coverage as a standalone or as part of an investment-linked plan?',0,'2026-06-25 17:40:22'),(66,31,'monthly_income','What is your comfortable monthly premium budget for this investment-linked plan?',0,'2026-06-26 04:11:37'),(67,31,'general','Do you prefer your investment plan to be denominated in Singapore Dollars (SGD) or US Dollars (USD)?',0,'2026-06-26 04:11:37'),(68,32,'monthly_income','What is your comfortable monthly premium budget for this wealth accumulation plan?',0,'2026-06-26 04:21:14'),(69,32,'general','Do you prefer your investment-linked plan to be denominated in SGD or USD?',0,'2026-06-26 04:21:14'),(70,33,'monthly_income','What is your comfortable monthly premium budget for this investment-linked plan?',0,'2026-06-26 05:19:11'),(71,33,'general','Do you prefer your investment-linked plan to be in SGD or USD?',0,'2026-06-26 05:19:11'),(72,34,'monthly_income','What is your comfortable monthly premium budget for this investment-linked plan?',0,'2026-06-26 05:28:09'),(73,34,'general','Do you prefer to invest in SGD or USD currency for your wealth accumulation plan?',0,'2026-06-26 05:28:09'),(74,35,'monthly_income','What is your comfortable monthly premium budget for this investment-linked plan?',0,'2026-07-03 07:50:59'),(75,35,'general','Do you prefer your investment to be in Singapore Dollars (SGD) or US Dollars (USD)?',0,'2026-07-03 07:50:59');
/*!40000 ALTER TABLE `missinginfo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productinterest`
--

DROP TABLE IF EXISTS `productinterest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productinterest` (
  `interest_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `product_category` varchar(100) DEFAULT NULL,
  `reason` text,
  `confidence` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`interest_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `productinterest_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productinterest`
--

LOCK TABLES `productinterest` WRITE;
/*!40000 ALTER TABLE `productinterest` DISABLE KEYS */;
/*!40000 ALTER TABLE `productinterest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `questionlog`
--

DROP TABLE IF EXISTS `questionlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questionlog` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `question` text,
  `related_product` varchar(100) DEFAULT NULL,
  `needs_advisor_clarification` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `questionlog_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `questionlog`
--

LOCK TABLES `questionlog` WRITE;
/*!40000 ALTER TABLE `questionlog` DISABLE KEYS */;
INSERT INTO `questionlog` VALUES (34,24,'I want to grow my wealth but I am not sure which product to discuss.','PRUVantage Assure Series / PRUVantage Wealth III (SGD) / PRUVantage Prosper / PRULink InvestGrowth',1,'2026-06-16 05:35:51'),(35,24,'I want monthly income, but are the returns guaranteed? I prefer SGD','PRUVantage Wealth III (SGD) / PRUVantage Prosper / PRUUnited Wealth',1,'2026-06-16 05:36:57'),(36,24,'Compare PRUVantage Prosper, PRUUnited Wealth, and PRUVantage Wealth III in simple terms.','PRUVantage Prosper / PRUUnited Wealth / PRUVantage Wealth III (SGD)',1,'2026-06-16 05:37:45'),(37,24,'Im comfortable with paying around 1000 a month for the next 5-10 years','PRUVantage Prosper / PRUUnited Wealth / PRUVantage Wealth III (SGD)',1,'2026-06-16 05:38:36'),(38,24,'So depending on the information I have given you so far can you help me choose a product I should mainly talk about with the advisor?','PRUVantage Prosper / PRUUnited Wealth / PRUVantage Wealth III (SGD)',1,'2026-06-16 05:39:39'),(39,24,'What questions should I ask the advisor before deciding?','PRUVantage Prosper / PRUUnited Wealth / PRUVantage Wealth III (SGD)',1,'2026-06-16 05:40:26'),(40,24,'Can you help me with Python homework?','General Prudential ILP',0,'2026-06-16 05:41:02'),(41,27,'I\'m not sure what type of insurance coverage I need. Can you guide me through the main areas?','Wealth Accumulation',1,'2026-06-24 15:28:53'),(42,27,'I\'m not sure what type of insurance coverage I need. Can you guide me through the main areas?','Wealth Accumulation',1,'2026-06-24 15:38:02'),(43,27,'What information is still missing from my profile before my advisor meeting?','Wealth Accumulation',1,'2026-06-24 15:49:09'),(44,27,'I want to understand medical coverage and health protection. What should I clarify?','Health Protection',1,'2026-06-24 15:50:25'),(45,27,'I am comfortable with paying 2k SGD a month which plans are an option for me?','Wealth Accumulation',1,'2026-06-24 15:52:04'),(46,27,'SGD','Wealth Accumulation',1,'2026-06-24 15:53:00'),(47,27,'10 years and I have 3 people dependent on me in total','Life Protection',1,'2026-06-24 15:53:50'),(48,27,'I\'m okay with up to 500','Wealth Accumulation',1,'2026-06-24 15:54:39'),(49,29,'I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','Wealth Accumulation',1,'2026-06-25 15:53:33'),(50,30,'I want to understand medical coverage and health protection. What should I clarify?','Health Protection',1,'2026-06-25 17:37:39'),(51,30,'i want critical illness','Health Protection',1,'2026-06-25 17:40:22'),(52,31,'I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','Wealth Accumulation',1,'2026-06-26 04:11:37'),(53,32,'I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','Wealth Accumulation',1,'2026-06-26 04:21:14'),(54,32,'1000sgd','Wealth Accumulation',1,'2026-06-26 04:23:08'),(55,33,'I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','Wealth Accumulation',1,'2026-06-26 05:19:11'),(56,33,'1000 sgd','Wealth Accumulation',1,'2026-06-26 05:19:41'),(57,34,'I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','Wealth Accumulation',1,'2026-06-26 05:28:09'),(58,35,'I want to grow my wealth while understanding the risks. What Prudential categories should I discuss?','Wealth Accumulation',1,'2026-07-03 07:50:59');
/*!40000 ALTER TABLE `questionlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `readinessscore`
--

DROP TABLE IF EXISTS `readinessscore`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `readinessscore` (
  `score_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `score` int DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  `reasons` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`score_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `readinessscore_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `readinessscore`
--

LOCK TABLES `readinessscore` WRITE;
/*!40000 ALTER TABLE `readinessscore` DISABLE KEYS */;
INSERT INTO `readinessscore` VALUES (27,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:41:09'),(28,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:44:18'),(29,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:53:00'),(30,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:56:08'),(31,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:56:30'),(32,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:56:51'),(33,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:57:07'),(34,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:57:13'),(35,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:58:04'),(36,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:58:48'),(37,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 05:59:12'),(38,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-16 06:00:04'),(39,25,0,'Needs more information before consultation','[\"Monthly income is missing.\",\"Risk appetite is missing.\",\"Main financial goal is missing.\",\"Existing insurance coverage is not provided.\",\"Customer has not asked any clarification questions yet.\"]','2026-06-24 13:28:41'),(40,24,90,'Ready for consultation','[\"Customer may need clarification about non-guaranteed returns.\"]','2026-06-24 13:32:00'),(41,26,80,'Ready for consultation','[\"Customer has not asked any clarification questions yet.\"]','2026-06-24 14:38:40'),(42,26,80,'Ready for consultation','[\"Customer has not asked any clarification questions yet.\"]','2026-06-24 14:54:00'),(43,26,80,'Ready for consultation','[\"Customer has not asked any clarification questions yet.\"]','2026-06-24 14:54:10'),(44,26,80,'Ready for consultation','[\"Customer has not asked any clarification questions yet.\"]','2026-06-24 14:54:17'),(45,26,80,'Ready for consultation','[\"Customer has not asked any clarification questions yet.\"]','2026-06-24 14:58:30'),(46,28,80,'Ready for consultation','[\"Customer has not asked any clarification questions yet.\"]','2026-06-25 14:27:38'),(47,25,0,'Needs more information before consultation','[\"Monthly income is missing.\",\"Risk appetite is missing.\",\"Main financial goal is missing.\",\"Existing insurance coverage is not provided.\",\"Customer has not asked any clarification questions yet.\"]','2026-06-25 14:41:39'),(48,28,80,'Ready for consultation','[\"Customer has not asked any clarification questions yet.\"]','2026-06-25 15:06:05'),(49,28,80,'Ready for consultation','[\"Customer has not asked any clarification questions yet.\"]','2026-06-25 15:43:01'),(50,29,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-25 15:57:50'),(51,29,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-25 16:09:57'),(52,29,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-25 16:33:35'),(53,29,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-25 16:33:45'),(54,29,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-25 16:33:47'),(55,30,100,'Ready for consultation','[]','2026-06-25 17:40:27'),(56,31,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-26 04:11:54'),(57,32,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-26 04:23:14'),(58,33,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-26 05:19:50'),(59,34,90,'Ready for consultation','[\"Customer has concerns about investment risk.\"]','2026-06-26 05:28:49');
/*!40000 ALTER TABLE `readinessscore` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suitabilitywarning`
--

DROP TABLE IF EXISTS `suitabilitywarning`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suitabilitywarning` (
  `warning_id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` int DEFAULT NULL,
  `warning_type` varchar(100) DEFAULT NULL,
  `severity` varchar(50) DEFAULT NULL,
  `message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`warning_id`),
  KEY `meeting_id` (`meeting_id`),
  CONSTRAINT `suitabilitywarning_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `meeting` (`meeting_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suitabilitywarning`
--

LOCK TABLES `suitabilitywarning` WRITE;
/*!40000 ALTER TABLE `suitabilitywarning` DISABLE KEYS */;
INSERT INTO `suitabilitywarning` VALUES (12,1,'Return Misunderstanding','High','Customer asked about guaranteed returns. Advisor should clarify that ILP returns are not guaranteed unless specific product terms apply.','2026-06-16 06:09:18');
/*!40000 ALTER TABLE `suitabilitywarning` ENABLE KEYS */;
UNLOCK TABLES;

--
+--
-- Table structure for post-meeting records
--

DROP TABLE IF EXISTS `postmeetingrecord`;
CREATE TABLE `postmeetingrecord` (
  `record_id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` int NOT NULL,
  `summary` text NOT NULL,
  `notes` longtext NOT NULL,
  `checklist` longtext NOT NULL,
  `follow_up_tasks` longtext NOT NULL,
  `approval_status` varchar(30) NOT NULL DEFAULT 'Draft',
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `uq_postmeetingrecord_meeting` (`meeting_id`),
  CONSTRAINT `fk_postmeetingrecord_meeting`
    FOREIGN KEY (`meeting_id`) REFERENCES `meeting` (`meeting_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `customercontact`;
CREATE TABLE `customercontact` (
  `customer_id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  CONSTRAINT `fk_customercontact_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `advisoractivitylog`;
CREATE TABLE `advisoractivitylog` (
  `activity_id` int NOT NULL AUTO_INCREMENT,
  `advisor_id` int DEFAULT NULL,
  `meeting_id` int DEFAULT NULL,
  `activity_type` varchar(60) NOT NULL,
  `title` varchar(255) NOT NULL,
  `details` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`),
  KEY `idx_activity_created` (`created_at`),
  CONSTRAINT `fk_activity_advisor` FOREIGN KEY (`advisor_id`) REFERENCES `advisor` (`advisor_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_activity_meeting` FOREIGN KEY (`meeting_id`) REFERENCES `meeting` (`meeting_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Rolling advisor slots for the live demo
-- These remain within the backend's next-7-days scheduling window regardless
-- of the date on which the database is imported.
--

INSERT INTO `advisorslot`
  (`advisor_id`, `start_datetime`, `end_datetime`, `meeting_type`, `is_booked`)
VALUES
  (1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:30:00'), 'Online', 0),
  (1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '16:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '16:30:00'), 'Offline', 0),
  (1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:30:00'), 'Online', 0),
  (1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '11:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '11:30:00'), 'Online', 0),
  (1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '15:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '15:30:00'), 'Online', 0),
  (1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '10:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '10:30:00'), 'Offline', 0),
  (1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '14:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '14:30:00'), 'Online', 0),
  (2, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:30:00'), 'Offline', 0),
  (3, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:30:00'), 'Online', 0),
  (4, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '19:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '19:30:00'), 'Online', 0),
  (5, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:30:00'), 'Online', 0),
  (6, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:30:00'), 'Offline', 0),
  (7, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '13:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '13:30:00'), 'Online', 0),
  (8, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '18:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '18:30:00'), 'Online', 0),
  (1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '16:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '16:30:00'), 'Offline', 0),
  (4, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '09:30:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '10:00:00'), 'Online', 0);

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-25 21:18:22
